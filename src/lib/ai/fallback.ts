import { aiConfig } from "./config";
import { coolDownFor, describeError, ResponseTimeoutError } from "./errors";
import type { StreamEvent } from "./events";
import { renderTurnText } from "./prompts";
import { streamGemini, toGeminiContents } from "./providers/gemini";
import { streamGroq, type GroqMessage } from "./providers/groq";
import { quota, type Slot } from "./quota";
import type { ChatTurn } from "./schema";

/** One provider, model and key to try, in order. */
export interface Attempt {
  slot: Slot;
  run: (signal: AbortSignal) => AsyncGenerator<StreamEvent>;
}

const ALL_BUSY_MESSAGE = "All models are at capacity right now. Please try again in a minute.";

const TOO_LONG_MESSAGE =
  "This question needs more working than fits in one answer. Try asking one part at a time.";

/** How many times an answer that breaks partway is started again on another model. */
const MAX_RESTARTS = 2;

function orderedSlots(provider: Slot["provider"], model: string, keyCount: number): Slot[] {
  const tokens = provider === "groq" ? aiConfig.groq.estimatedAnswerTokens : 0;
  return Array.from({ length: keyCount }, (_, keyIndex): Slot => ({ provider, model, keyIndex }))
    .filter((slot) => quota.hasCapacity(slot, tokens))
    .sort((a, b) => quota.headroom(b) - quota.headroom(a));
}

interface GroqAttemptOptions {
  system: string;
  turns: ChatTurn[];
  runCode: boolean;
  reasoningEffort: "low" | "medium" | "high";
  /** Appended when the output reaches the length limit, instead of the default note. */
  truncatedNote?: string;
}

export function groqAttempts({
  system,
  turns,
  runCode,
  reasoningEffort,
  truncatedNote,
}: GroqAttemptOptions): Attempt[] {
  const { keys, solverModel } = aiConfig.groq;
  const messages: GroqMessage[] = [
    { role: "system", content: system },
    ...turns.map((turn) => ({ role: turn.role, content: renderTurnText(turn) })),
  ];
  return orderedSlots("groq", solverModel, keys.length).map((slot) => ({
    slot,
    run: (signal) =>
      streamGroq({
        apiKey: keys[slot.keyIndex],
        model: slot.model,
        messages,
        runCode,
        reasoningEffort,
        truncatedNote,
        signal,
        onHeaders: (headers) => quota.recordHeaders(slot, headers),
      }),
  }));
}

export function geminiAttempts({
  system,
  turns,
}: {
  system: string;
  turns: ChatTurn[];
}): Attempt[] {
  const { keys, models } = aiConfig.gemini;
  const contents = toGeminiContents(turns);
  const hasPdf = turns.some((turn) =>
    turn.images?.some((file) => file.mimeType === "application/pdf"),
  );
  return models.flatMap((model) =>
    orderedSlots("gemini", model, keys.length).map((slot) => ({
      slot,
      run: (signal) =>
        streamGemini({
          apiKey: keys[slot.keyIndex],
          model: slot.model,
          contents,
          systemInstruction: system,
          codeExecution: !hasPdf,
          signal,
        }),
    })),
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new ResponseTimeoutError(ms));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Streams the first attempt that starts responding and actually writes text, falling back
 * across keys, models and providers. Returns the text written, or null after emitting an
 * error event.
 */
export async function* streamFirstAvailable(
  attempts: Attempt[],
  signal: AbortSignal,
  options: { firstTokenTimeoutMs?: number } = {},
): AsyncGenerator<StreamEvent, string | null> {
  const firstTokenTimeoutMs = options.firstTokenTimeoutMs ?? aiConfig.firstTokenTimeoutMs;
  let producedNothing = false;
  let unavailable = false;
  let restarts = 0;

  for (const attempt of attempts) {
    if (signal.aborted) return null;

    const attemptController = new AbortController();
    const events = attempt.run(AbortSignal.any([signal, attemptController.signal]));
    quota.recordRequest(attempt.slot);

    let first: IteratorResult<StreamEvent>;
    try {
      first = await withTimeout(events.next(), firstTokenTimeoutMs, () =>
        attemptController.abort(),
      );
    } catch (error) {
      attemptController.abort();
      if (signal.aborted) return null;
      quota.coolDown(attempt.slot, coolDownFor(error));
      unavailable = true;
      console.warn(
        `[fallback] ${attempt.slot.model} #${attempt.slot.keyIndex + 1}: ${describeError(error)}`,
      );
      continue;
    }

    yield { type: "start", provider: attempt.slot.provider, model: attempt.slot.model };
    let text = "";
    try {
      // A model that goes silent mid-answer is abandoned rather than left hanging.
      for (
        let result = first;
        !result.done;
        result = await withTimeout(events.next(), aiConfig.streamIdleTimeoutMs, () =>
          attemptController.abort(),
        )
      ) {
        if (result.value.type === "text") text += result.value.text;
        yield result.value;
      }
    } catch (error) {
      if (signal.aborted) return null;
      console.warn(`[fallback] stream broke on ${attempt.slot.model}: ${describeError(error)}`);
      if (text) {
        // A model that fails partway, for example with "high demand", is replaced by the next
        // one, which writes the answer again from the start.
        quota.coolDown(attempt.slot, coolDownFor(error));
        unavailable = true;
        restarts += 1;
        if (restarts > MAX_RESTARTS) {
          yield { type: "error", message: "The answer was interrupted. Please try again." };
          return null;
        }
        yield { type: "reset" };
        continue;
      }
    }

    // Hard questions can use the whole output budget on reasoning and never write an answer.
    if (!text.trim()) {
      console.warn(`[fallback] ${attempt.slot.model} wrote no text; trying the next model`);
      producedNothing = true;
      yield { type: "reset" };
      continue;
    }
    return text;
  }

  if (!signal.aborted) {
    yield {
      type: "error",
      message: producedNothing && !unavailable ? TOO_LONG_MESSAGE : ALL_BUSY_MESSAGE,
    };
  }
  return null;
}
