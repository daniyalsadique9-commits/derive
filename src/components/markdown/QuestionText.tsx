"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toRenderableMarkdown } from "@/lib/client/answer-text";

/** Markdown merges single line breaks; students expect theirs to stay. */
function keepLineBreaks(text: string): string {
  return text.replace(/\n/g, "  \n");
}

/** A student's question, with LaTeX such as \frac{a}{b} rendered as maths. */
export function QuestionText({ text }: { text: string }) {
  return (
    <div className="question-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
      >
        {keepLineBreaks(toRenderableMarkdown(text))}
      </ReactMarkdown>
    </div>
  );
}
