"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

// Paragraphs render as plain fragments so the result can sit inside a sentence.
const INLINE_COMPONENTS: Components = {
  p: ({ children }) => <>{children}</>,
};

/** Short Markdown (with maths) rendered inline, e.g. inside a badge. */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
      components={INLINE_COMPONENTS}
      allowedElements={["p", "strong", "em", "code", "span", "math", "semantics", "annotation"]}
      unwrapDisallowed
    >
      {text}
    </ReactMarkdown>
  );
}
