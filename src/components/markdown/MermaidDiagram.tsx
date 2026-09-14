"use client";

import { useEffect, useId, useState } from "react";
import { prepareMermaid } from "@/lib/client/mermaid-source";

type RenderState = { status: "pending" } | { status: "ready"; svg: string } | { status: "failed" };

interface MermaidDiagramProps {
  source: string;
  /** False while the answer is still streaming, when the diagram source may be incomplete. */
  ready: boolean;
}

/** Renders a Mermaid diagram written by the model; shows the source if it doesn't parse. */
export function MermaidDiagram({ source, ready }: MermaidDiagramProps) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [state, setState] = useState<RenderState>({ status: "pending" });

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      const diagram = prepareMermaid(source);
      try {
        if (!(await mermaid.parse(diagram, { suppressErrors: true }))) throw new Error("Invalid");
        const { svg } = await mermaid.render(id, diagram);
        if (!cancelled) setState({ status: "ready", svg });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [id, ready, source]);

  if (state.status === "ready") {
    return (
      <figure
        className="not-prose my-5 flex justify-center overflow-x-auto rounded-xl border border-line bg-white p-4"
        // Mermaid output is sanitised by its "strict" security level.
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    );
  }

  if (state.status === "failed") {
    return (
      <pre>
        <code>{source}</code>
      </pre>
    );
  }

  return (
    <div className="not-prose my-5 grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-muted">
      Drawing concept map…
    </div>
  );
}
