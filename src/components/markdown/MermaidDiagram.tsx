"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";
import { prepareMermaid } from "@/lib/client/mermaid-source";

type RenderState = { status: "pending" } | { status: "ready"; svg: string } | { status: "failed" };

interface MermaidDiagramProps {
  source: string;
  /** False while the answer is still streaming, when the diagram source may be incomplete. */
  ready: boolean;
}

/** Diagram styling that matches the app: soft red boxes, readable text, smooth connectors. */
const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "15px",
    primaryColor: "#fdf1f0",
    primaryBorderColor: "#e9a3a0",
    primaryTextColor: "#1f1e1b",
    secondaryColor: "#f3f1ea",
    tertiaryColor: "#ffffff",
    lineColor: "#8a867c",
    edgeLabelBackground: "#ffffff",
  },
  flowchart: { curve: "basis", padding: 18, nodeSpacing: 40, rankSpacing: 52 },
} as const;

/** Rounded, softly shadowed boxes, medium-weight labels and slightly heavier connectors. */
const ROUNDED_NODES = [
  "[&_.node_rect]:[rx:10px] [&_.node_rect]:[ry:10px]",
  "[&_.node_rect]:[filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.08))]",
  "[&_.nodeLabel]:font-medium",
  "[&_.flowchart-link]:[stroke-width:1.6px]",
].join(" ");

/** Renders a Mermaid diagram written by the model; shows the source if it doesn't parse. */
export function MermaidDiagram({ source, ready }: MermaidDiagramProps) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [state, setState] = useState<RenderState>({ status: "pending" });
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize(MERMAID_CONFIG);
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
    // Mermaid output is sanitised by its "strict" security level.
    return (
      <div className="not-prose group relative my-5">
        <figure
          onClick={() => setZoomed(true)}
          className={`flex cursor-zoom-in justify-center overflow-x-auto rounded-xl border border-line bg-white p-4 ${ROUNDED_NODES}`}
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Enlarge diagram"
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg bg-white/90 text-ink-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Maximize2 className="size-4" />
        </button>
        <Lightbox open={zoomed} onClose={() => setZoomed(false)} label="Diagram">
          <div
            className={`[&_svg]:h-auto [&_svg]:w-[min(92vw,1400px)] [&_svg]:!max-w-none ${ROUNDED_NODES}`}
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
        </Lightbox>
      </div>
    );
  }

  // Students never see diagram source code, even when it can't be drawn.
  if (state.status === "failed") {
    return (
      <p className="not-prose my-5 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-muted">
        This diagram could not be drawn. Ask again and it will be redrawn.
      </p>
    );
  }

  return (
    <div className="not-prose my-5 grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-muted">
      Drawing concept map…
    </div>
  );
}
