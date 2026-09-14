import { GoogleGenAI, Outcome, ThinkingLevel, type Content } from "@google/genai";
import { renderTurnText } from "../prompts";
import type { ChatTurn } from "../schema";
import type { StreamEvent } from "../events";

const clients = new Map<string, GoogleGenAI>();

/** Gemini occasionally emits its reasoning as ordinary text that starts with "thought". */
const LEAKED_THOUGHT = /^\s*thought\b/i;
const ANSWER_START = /^##\s+Question\s*$/gim;

/** The answer written after leaked reasoning: everything from the last "## Question" heading. */
function answerAfterLeakedThought(text: string): string {
  const start = [...text.matchAll(ANSWER_START)].at(-1)?.index;
  return start === undefined ? "" : text.slice(start);
}

function clientFor(apiKey: string): GoogleGenAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export function toGeminiContents(turns: ChatTurn[]): Content[] {
  return turns.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [
      ...(turn.images ?? []).map((image) => ({
        inlineData: { mimeType: image.mimeType, data: image.data },
      })),
      { text: renderTurnText(turn) },
    ],
  }));
}

interface GeminiStreamOptions {
  apiKey: string;
  model: string;
  contents: Content[];
  systemInstruction: string;
  /** Gemini rejects PDF input when code execution is on, so it is off for PDF conversations. */
  codeExecution: boolean;
  signal: AbortSignal;
}

/**
 * Streams an answer with Gemini's built-in code execution, so graphs are real matplotlib
 * output and numbers are computed rather than guessed.
 */
export async function* streamGemini(options: GeminiStreamOptions): AsyncGenerator<StreamEvent> {
  const stream = await clientFor(options.apiKey).models.generateContentStream({
    model: options.model,
    contents: options.contents,
    config: {
      systemInstruction: options.systemInstruction,
      ...(options.codeExecution && { tools: [{ codeExecution: {} }] }),
      // Thought summaries arrive early, which tells us the model is alive while it reasons.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM, includeThoughts: true },
      abortSignal: options.signal,
    },
  });

  let announcedThinking = false;
  let wroteText = false;
  // Leaked reasoning is held back here, and only the answer after it is sent at the end.
  let leaked: string | null = null;
  let totalTokens = 0;
  // Gemini can repeat a generated image in a later chunk; show each one once.
  const shownImages = new Set<string>();

  for await (const chunk of stream) {
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (part.thought) {
        if (!announcedThinking) {
          announcedThinking = true;
          yield { type: "thinking" };
        }
      } else if (part.text) {
        if (!wroteText && leaked === null && LEAKED_THOUGHT.test(part.text)) leaked = "";
        if (leaked !== null) {
          leaked += part.text;
          // Keeps the stream alive while the text is held back.
          yield { type: "thinking" };
        } else {
          wroteText = true;
          yield { type: "text", text: part.text };
        }
      } else if (part.executableCode?.code) {
        yield { type: "code", code: part.executableCode.code };
      } else if (part.codeExecutionResult) {
        yield {
          type: "codeResult",
          output: part.codeExecutionResult.output ?? "",
          ok: part.codeExecutionResult.outcome === Outcome.OUTCOME_OK,
        };
      } else if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
        const { data, mimeType } = part.inlineData;
        const fingerprint = `${data.length}:${data.slice(-64)}`;
        if (!shownImages.has(fingerprint)) {
          shownImages.add(fingerprint);
          yield { type: "image", mimeType, data };
        }
      }
    }
    totalTokens = chunk.usageMetadata?.totalTokenCount ?? totalTokens;
  }

  if (leaked !== null) {
    const answer = answerAfterLeakedThought(leaked);
    if (answer) yield { type: "text", text: answer };
    else console.warn("[gemini] reasoning leaked into the answer; no answer found after it");
  }
  if (totalTokens > 0) yield { type: "usage", totalTokens };
}
