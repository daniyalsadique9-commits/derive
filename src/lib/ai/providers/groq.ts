import OpenAI from "openai";
import { aiConfig } from "../config";
import type { StreamEvent } from "../events";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export type GroqMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** Groq additions to the OpenAI streaming delta. */
interface GroqDelta {
  content?: string | null;
  reasoning?: string | null;
  executed_tools?: { index: number; arguments?: string; output?: string }[];
}

const clients = new Map<string, OpenAI>();

function clientFor(apiKey: string): OpenAI {
  let client = clients.get(apiKey);
  if (!client) {
    // Retries are handled by the fallback chain, which moves on to another key or provider.
    client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, maxRetries: 0, timeout: 90_000 });
    clients.set(apiKey, client);
  }
  return client;
}

interface GroqCallOptions {
  apiKey: string;
  model: string;
  messages: GroqMessage[];
  signal: AbortSignal;
  /** Receives rate-limit headers from every response, including errors. */
  onHeaders: (headers: Headers) => void;
}

async function withQuotaHeaders<T>(
  request: Promise<{ data: T; response: Response }>,
  onHeaders: (headers: Headers) => void,
): Promise<T> {
  try {
    const { data, response } = await request;
    onHeaders(response.headers);
    return data;
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.headers) onHeaders(error.headers);
    throw error;
  }
}

const TRUNCATED_NOTE =
  "\n\n*This answer was cut short because it reached the length limit. Ask for the remaining part as a follow-up.*";

/**
 * Groq's free tier rejects a request whose prompt plus maximum output exceeds the per-minute
 * token limit, so the output budget is whatever that limit leaves after the prompt.
 */
function completionBudget(messages: GroqMessage[]): number {
  const promptTokens = Math.ceil(JSON.stringify(messages).length / 3.5);
  const { tokensPerMinute, maxCompletionTokens } = aiConfig.groq;
  return Math.max(1024, Math.min(maxCompletionTokens, tokensPerMinute - promptTokens - 300));
}

/** Streams an answer, optionally letting the model run Python in Groq's sandbox. */
export async function* streamGroq(
  options: GroqCallOptions & { runCode: boolean; reasoningEffort: "low" | "medium" | "high" },
): AsyncGenerator<StreamEvent> {
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model: options.model,
    messages: options.messages,
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: completionBudget(options.messages),
    reasoning_effort: options.reasoningEffort,
    // Groq's built-in Python sandbox isn't part of OpenAI's type definitions.
    ...(options.runCode && {
      tools: [
        { type: "code_interpreter" },
      ] as unknown as OpenAI.Chat.Completions.ChatCompletionTool[],
    }),
  };

  const stream = await withQuotaHeaders(
    clientFor(options.apiKey)
      .chat.completions.create(params, { signal: options.signal })
      .withResponse(),
    options.onHeaders,
  );

  let announcedThinking = false;
  const shownCode = new Set<number>();
  let wroteText = false;
  let finishReason: string | null = null;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as GroqDelta | undefined;
    finishReason = chunk.choices[0]?.finish_reason ?? finishReason;

    if (delta?.reasoning && !announcedThinking) {
      announcedThinking = true;
      yield { type: "thinking" };
    }

    // Each tool call arrives twice: first with the code, then again with its output.
    for (const tool of delta?.executed_tools ?? []) {
      if (tool.arguments && !shownCode.has(tool.index)) {
        shownCode.add(tool.index);
        yield { type: "code", code: tool.arguments };
      }
      if (tool.output !== undefined) {
        yield {
          type: "codeResult",
          output: tool.output,
          ok: !/Traceback|Error:/.test(tool.output),
        };
      }
    }

    if (delta?.content) {
      wroteText = true;
      yield { type: "text", text: delta.content };
    }
    if (chunk.usage?.total_tokens) yield { type: "usage", totalTokens: chunk.usage.total_tokens };
  }

  if (wroteText && finishReason === "length") yield { type: "text", text: TRUNCATED_NOTE };
}

/** One non-streaming completion; returns the reply text. */
export async function completeGroq(
  options: GroqCallOptions & { maxTokens: number },
): Promise<string> {
  const completion = await withQuotaHeaders(
    clientFor(options.apiKey)
      .chat.completions.create(
        {
          model: options.model,
          messages: options.messages,
          max_completion_tokens: options.maxTokens,
          temperature: 0.2,
        },
        { signal: options.signal },
      )
      .withResponse(),
    options.onHeaders,
  );
  return completion.choices[0]?.message.content ?? "";
}
