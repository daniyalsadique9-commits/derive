"use client";

import Image from "next/image";
import {
  ArrowUp,
  FileText,
  ImagePlus,
  Languages,
  MessageSquareQuote,
  Square,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type { AnswerLanguage, ExplanationStyle, ImageInput } from "@/lib/ai/schema";
import { compressImage, readPdf, toDataUrl } from "@/lib/client/image";
import { cn } from "@/lib/utils/cn";

const MAX_IMAGES = 3;
const PDF_TYPE = "application/pdf";
const MAX_TEXTAREA_HEIGHT = 240;

const STYLE_OPTIONS: { value: ExplanationStyle; label: string; hint: string }[] = [
  { value: "intuitive", label: "Intuitive", hint: "Plain language and intuition" },
  { value: "formal", label: "Formal", hint: "Textbook rigour and notation" },
  { value: "analogy", label: "Analogy", hint: "Explained through a real-world comparison" },
];

const LANGUAGE_LABELS: Record<AnswerLanguage, string> = {
  english: "English",
  hinglish: "Hinglish",
};

export type ComposerMode = "ask" | "explainBack";

interface ComposerProps {
  onSubmit: (content: string, images?: ImageInput[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  style: ExplanationStyle;
  onStyleChange: (style: ExplanationStyle) => void;
  language: AnswerLanguage;
  onLanguageChange: (language: AnswerLanguage) => void;
  mode: ComposerMode;
  onCancelMode: () => void;
}

/** A segmented control on wider screens and a compact native select on phones. */
function StylePicker({
  value,
  onChange,
}: {
  value: ExplanationStyle;
  onChange: (style: ExplanationStyle) => void;
}) {
  return (
    <>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ExplanationStyle)}
        aria-label="Explanation style"
        className="h-8 rounded-lg bg-subtle px-2 text-xs font-medium text-ink outline-none sm:hidden"
      >
        {STYLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div
        role="radiogroup"
        aria-label="Explanation style"
        className="hidden rounded-lg bg-subtle p-0.5 sm:flex"
      >
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              value === option.value
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: AnswerLanguage;
  onChange: (language: AnswerLanguage) => void;
}) {
  const next: AnswerLanguage = value === "english" ? "hinglish" : "english";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title={`Answer language. Switch to ${LANGUAGE_LABELS[next]}`}
      aria-label={`Answer language: ${LANGUAGE_LABELS[value]}. Switch to ${LANGUAGE_LABELS[next]}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
    >
      <Languages className="size-3.5" />
      {LANGUAGE_LABELS[value]}
    </button>
  );
}

export function Composer({
  onSubmit,
  onStop,
  isStreaming,
  style,
  onStyleChange,
  language,
  onLanguageChange,
  mode,
  onCancelMode,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

  function resize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  async function addFiles(files: Iterable<File>) {
    const picked = Array.from(files)
      .filter((file) => file.type.startsWith("image/") || file.type === PDF_TYPE)
      .slice(0, MAX_IMAGES - images.length);
    if (picked.length === 0) return;
    try {
      const prepared = await Promise.all(
        picked.map((file) => (file.type === PDF_TYPE ? readPdf(file) : compressImage(file))),
      );
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message.startsWith("PDFs")
          ? reason.message
          : "This file could not be read. Try a JPG, PNG or PDF file.",
      );
    }
  }

  const canSend = !isStreaming && (text.trim().length > 0 || images.length > 0);

  function submit() {
    if (!canSend) return;
    onSubmit(text.trim(), images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
    requestAnimationFrame(resize);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (event.clipboardData.files.length > 0) {
      event.preventDefault();
      void addFiles(event.clipboardData.files);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  }

  const placeholder =
    mode === "explainBack" ? "Explain the concept in your own words…" : "Ask a question…";

  return (
    <div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="rounded-[1.25rem] border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] transition focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10"
      >
        {mode === "explainBack" && (
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm">
            <MessageSquareQuote className="size-4 shrink-0 text-accent" />
            <span className="text-ink">Explain the concept in your own words to get feedback.</span>
            <button
              type="button"
              onClick={onCancelMode}
              className="ml-auto text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}

        {images.length > 0 && (
          <div className="flex gap-2 px-3 pt-3">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative size-16 overflow-hidden rounded-lg border border-line"
              >
                {image.mimeType === PDF_TYPE ? (
                  <div
                    title={image.name}
                    className="flex size-full flex-col items-center justify-center gap-1 bg-subtle px-1 text-ink-muted"
                  >
                    <FileText className="size-5 text-accent" />
                    <span className="w-full truncate text-center text-[0.6rem]">{image.name}</span>
                  </div>
                ) : (
                  <Image
                    src={toDataUrl(image)}
                    alt={`Attachment ${index + 1}`}
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                )}
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-label={placeholder}
          className="block max-h-60 w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[0.95rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted/70"
        />

        <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            aria-label="Attach a photo or PDF"
            title="Attach a photo or PDF (or paste / drop one)"
            className="grid size-9 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-subtle hover:text-ink disabled:opacity-40"
          >
            <ImagePlus className="size-[18px]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <StylePicker value={style} onChange={onStyleChange} />
          <LanguageToggle value={language} onChange={onLanguageChange} />
          <div className="ml-auto">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop answering"
                className="grid size-9 place-items-center rounded-xl bg-ink text-canvas transition-opacity hover:opacity-85"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                aria-label="Send"
                className="grid size-9 place-items-center rounded-xl bg-accent text-canvas transition-colors hover:bg-accent-hover disabled:opacity-40"
              >
                <ArrowUp className="size-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-warning">{error}</p>}
    </div>
  );
}
