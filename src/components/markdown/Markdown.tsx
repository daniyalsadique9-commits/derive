"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { startsMermaid } from "@/lib/utils/mermaid-lines";
import { CircuitDiagram } from "./CircuitDiagram";
import { MermaidDiagram } from "./MermaidDiagram";
import { Schematic } from "./Schematic";

interface HastNode {
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

/** The language ("" when none) and source of a code block, given its <pre> element, or null. */
function fencedBlock(pre: unknown): { language: string; source: string } | null {
  const code = (pre as HastNode | undefined)?.children?.[0];
  if (code?.tagName !== "code") return null;
  const classes = code.properties?.className;
  const language =
    (Array.isArray(classes) ? classes : [])
      .find((name): name is string => typeof name === "string" && name.startsWith("language-"))
      ?.slice("language-".length) ?? "";
  return { language, source: (code.children ?? []).map((child) => child.value ?? "").join("") };
}

function buildComponents(streaming: boolean): Components {
  return {
    pre({ node, children }) {
      const block = fencedBlock(node);
      if (block?.language === "schematic") {
        return <Schematic name={block.source.trim()} />;
      }
      // A diagram without its language tag is still drawn, never shown as code.
      const isMermaid =
        block?.language === "mermaid" || (block?.language === "" && startsMermaid(block.source));
      if (block && isMermaid) {
        return <MermaidDiagram source={block.source} ready={!streaming} />;
      }
      // Models sometimes label a circuit description as plain JSON; draw it all the same.
      const isCircuit =
        block?.language === "circuit" ||
        (block?.language === "json" && /"elements"\s*:/.test(block.source));
      if (block && isCircuit) {
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
