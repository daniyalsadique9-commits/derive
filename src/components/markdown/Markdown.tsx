"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidDiagram } from "./MermaidDiagram";

interface HastNode {
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

/** Returns the source of a ```mermaid block, given its <pre> element, or null. */
function mermaidSource(pre: unknown): string | null {
  const code = (pre as HastNode | undefined)?.children?.[0];
  const classes = code?.properties?.className;
  if (
    code?.tagName !== "code" ||
    !Array.isArray(classes) ||
    !classes.includes("language-mermaid")
  ) {
    return null;
  }
  return (code.children ?? []).map((child) => child.value ?? "").join("");
}

function buildComponents(streaming: boolean): Components {
  return {
    pre({ node, children }) {
      const source = mermaidSource(node);
      if (source !== null) return <MermaidDiagram source={source} ready={!streaming} />;
      return <pre>{children}</pre>;
    },
    table({ children }) {
      return (
        <div className="table-scroll">
          <table>{children}</table>
        </div>
      );
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
  };
}

const STREAMING_COMPONENTS = buildComponents(true);
const FINAL_COMPONENTS = buildComponents(false);

export const Markdown = memo(function Markdown({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  return (
    <div className="answer prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={streaming ? STREAMING_COMPONENTS : FINAL_COMPONENTS}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
