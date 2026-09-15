import type { ProviderId, StreamEvent, Verification } from "@/lib/ai/events";
import type { ChatTurn, ImageInput, Intent } from "@/lib/ai/schema";
import { extractTopic, stripComments } from "./answer-text";

export type Block =
  | { kind: "text"; text: string }
  | { kind: "code"; code: string; output?: string; ok?: boolean }
  /** `id` names the graph in browser storage; saved history keeps the id with empty data. */
  | { kind: "image"; mimeType: string; data: string; id?: string };

/** What history keeps of an attachment: a small thumbnail for photos, the name for PDFs. */
export interface AttachmentPreview {
  mimeType: string;
  name?: string;
  data?: string;
}

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
  intent: Intent;
  /** Full attachments, sent with the question and kept only in memory. */
  images?: ImageInput[];
  previews?: AttachmentPreview[];
}

export type AnswerPhase = "waiting" | "thinking" | "writing" | "verifying" | "done" | "error";

export interface AssistantMessage {
  id: string;
  role: "assistant";
  phase: AnswerPhase;
  blocks: Block[];
  error?: string;
  provider?: ProviderId;
  model?: string;
  totalTokens?: number;
  verification?: Verification;
}

export type Message = UserMessage | AssistantMessage;

export interface Conversation {
  id: string;
  title: string;
  subject?: string;
  topic?: string;
  createdAt: number;
  updatedAt: number;
  bookmarked: boolean;
  messages: Message[];
}

/** How many recent turns to send; the server trims further. */
const MAX_TURNS_SENT = 16;

export const newId = () => crypto.randomUUID();

export function createConversation(firstQuestion: string, hasImages: boolean): Conversation {
  const now = Date.now();
  const title = firstQuestion.trim().replace(/\s+/g, " ").slice(0, 80);
  return {
    id: newId(),
    title: title || (hasImages ? "Photo question" : "New question"),
    createdAt: now,
    updatedAt: now,
    bookmarked: false,
    messages: [],
  };
}

export function isAnswerStreaming(message: AssistantMessage): boolean {
  return message.phase !== "done" && message.phase !== "error";
}

export function answerText(message: AssistantMessage): string {
  return message.blocks
    .flatMap((block) => (block.kind === "text" ? [block.text] : []))
    .join("\n\n");
}

function appendText(blocks: Block[], text: string): Block[] {
  const last = blocks[blocks.length - 1];
  if (last?.kind === "text") {
    return [...blocks.slice(0, -1), { kind: "text", text: last.text + text }];
  }
  return [...blocks, { kind: "text", text }];
}

function attachCodeOutput(blocks: Block[], output: string, ok: boolean): Block[] {
  const index = blocks.findLastIndex(
    (block) => block.kind === "code" && block.output === undefined,
  );
  if (index === -1) return blocks;
  return blocks.map((block, i) => (i === index ? { ...block, output, ok } : block));
}

/** Pure reducer: applies one streamed event to the answer being built. */
export function applyEvent(message: AssistantMessage, event: StreamEvent): AssistantMessage {
  switch (event.type) {
    case "start":
      return { ...message, provider: event.provider, model: event.model };
    case "thinking":
      return message.phase === "waiting" ? { ...message, phase: "thinking" } : message;
    case "text":
      return { ...message, phase: "writing", blocks: appendText(message.blocks, event.text) };
    case "code":
      return { ...message, blocks: [...message.blocks, { kind: "code", code: event.code }] };
    case "codeResult":
      return { ...message, blocks: attachCodeOutput(message.blocks, event.output, event.ok) };
    case "image":
      return {
        ...message,
        blocks: [
          ...message.blocks,
          { kind: "image", mimeType: event.mimeType, data: event.data, id: newId() },
        ],
      };
    case "reset":
      return {
        ...message,
        phase: "thinking",
        blocks: [],
        provider: undefined,
        model: undefined,
        totalTokens: undefined,
      };
    case "usage":
      return { ...message, totalTokens: event.totalTokens };
    case "verifying":
      return { ...message, phase: "verifying" };
    case "verification":
      return { ...message, verification: event.result };
    case "error":
      return { ...message, phase: "error", error: event.message };
    case "done":
      return { ...message, phase: "done" };
  }
}

/** Builds the API history: failed exchanges are dropped and only the newest turn keeps images. */
export function toTurns(messages: Message[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  messages.forEach((message, index) => {
    if (message.role === "user") {
      const reply = messages[index + 1];
      if (reply?.role === "assistant" && reply.phase === "error") return;
      turns.push({
        role: "user",
        content: message.content,
        intent: message.intent,
        images: index === messages.length - 1 ? message.images : undefined,
      });
    } else if (message.phase !== "error") {
      turns.push({ role: "assistant", content: stripComments(answerText(message)) });
    }
  });
  return turns.slice(-MAX_TURNS_SENT);
}

/** Fills in subject and topic from the first answer, if the model tagged it. */
export function withDetectedTopic(conversation: Conversation): Conversation {
  if (conversation.subject) return conversation;
  const firstAnswer = conversation.messages.find(
    (message): message is AssistantMessage => message.role === "assistant",
  );
  const detected = firstAnswer ? extractTopic(answerText(firstAnswer)) : null;
  return detected ? { ...conversation, ...detected } : conversation;
}
