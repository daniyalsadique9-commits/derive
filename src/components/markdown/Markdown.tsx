"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CircuitDiagram } from "./CircuitDiagram";
import { MermaidDiagram } from "./MermaidDiagram";

interface HastNode {
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

/** The language and source of a fenced code block, given its <pre> element, or null. */
function fencedBlock(pre: unknown): { language: string; source: string } | null {
  const code = (pre as HastNode | undefined)?.children?.[0];
  const classes = code?.properties?.className;
  if (code?.tagName !== "code" || !Array.isArray(classes)) return null;
  const language = classes
    .find((name): name is string => typeof name === "string" && name.startsWith("language-"))
    ?.slice("language-".length);
  if (!language) return null;
  return { language, source: (code.children ?? []).map((child) => child.value ?? "").join("") };
}

function buildComponents(streaming: boolean): Components {
  return {
    pre({ node, children }) {
      const block = fencedBlock(node);
      if (block?.language === "mermaid") {
        return <MermaidDiagram source={block.source} ready={!streaming} />;
      }
      if (block?.language === "circuit") {
        return <CircuitDiagram source={block.source} ready={!streaming} />;
      }
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
