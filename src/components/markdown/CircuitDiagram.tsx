"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Lightbox } from "@/components/ui/Lightbox";
import { parseCircuit, type Circuit, type Part } from "@/lib/client/circuit";

/** Drawing units: one part along a wire, the gap between parallel branches, and margins. */
const SLOT = 110;
const ROW = 96;
const TOP = 70;
const LEFT = 120;
const RIGHT_MARGIN = 40;
const LEAD = 30;
const GROUP_PAD = 26;
const INK = "#1f1e1b";
const MUTED = "#57534b";
const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

const textProps = { stroke: "none", fill: MUTED, fontSize: 13, fontFamily: FONT } as const;

/** A part's symbol, 60 units wide, centred on the origin along a horizontal wire. */
function partSymbol(type: Part["type"]): ReactNode {
  switch (type) {
    case "resistor":
      return <polyline points="-30,0 -25,-8 -15,8 -5,-8 5,8 15,-8 25,8 30,0" />;
    case "capacitor":
      return (
        <>
          <line x1={-30} y1={0} x2={-6} y2={0} />
          <line x1={-6} y1={-16} x2={-6} y2={16} />
          <line x1={6} y1={-16} x2={6} y2={16} />
          <line x1={6} y1={0} x2={30} y2={0} />
        </>
      );
    case "inductor":
      return (
        <>
          <line x1={-30} y1={0} x2={-24} y2={0} />
          <path d="M -24 0 a 6 6 0 0 1 12 0 a 6 6 0 0 1 12 0 a 6 6 0 0 1 12 0 a 6 6 0 0 1 12 0" />
          <line x1={24} y1={0} x2={30} y2={0} />
        </>
      );
    case "diode":
    case "led":
      return (
        <>
          <line x1={-30} y1={0} x2={-12} y2={0} />
          <polygon points="-12,-11 -12,11 10,0" />
          <line x1={10} y1={-11} x2={10} y2={11} />
          <line x1={10} y1={0} x2={30} y2={0} />
          {type === "led" && (
            <>
              <polyline points="0,-14 8,-24" />
              <polyline points="4,-24 8,-24 8,-20" />
              <polyline points="8,-11 16,-21" />
              <polyline points="12,-21 16,-21 16,-17" />
            </>
          )}
        </>
      );
    case "lamp":
      return (
        <>
          <line x1={-30} y1={0} x2={-14} y2={0} />
          <circle r={14} />
          <line x1={-10} y1={-10} x2={10} y2={10} />
          <line x1={-10} y1={10} x2={10} y2={-10} />
          <line x1={14} y1={0} x2={30} y2={0} />
        </>
      );
    case "switch":
      return (
        <>
          <line x1={-30} y1={0} x2={-18} y2={0} />
          <circle cx={-18} r={3} fill={INK} />
          <line x1={-18} y1={0} x2={15} y2={-15} />
          <circle cx={18} r={3} fill={INK} />
          <line x1={18} y1={0} x2={30} y2={0} />
        </>
      );
    case "fuse":
      return (
        <>
          <line x1={-30} y1={0} x2={30} y2={0} />
          <rect x={-18} y={-7} width={36} height={14} rx={3} />
        </>
      );
    case "ammeter":
    case "voltmeter":
    case "galvanometer":
      return (
        <>
          <line x1={-30} y1={0} x2={-15} y2={0} />
          <circle r={15} />
          <text {...textProps} fill={INK} fontSize={14} fontWeight={600} textAnchor="middle" y={5}>
            {type === "ammeter" ? "A" : type === "voltmeter" ? "V" : "G"}
          </text>
          <line x1={15} y1={0} x2={30} y2={0} />
        </>
      );
    case "battery":
      return (
        <>
          <line x1={-30} y1={0} x2={-6} y2={0} />
          <line x1={-6} y1={-16} x2={-6} y2={16} />
          <line x1={6} y1={-9} x2={6} y2={9} strokeWidth={4} />
          <line x1={6} y1={0} x2={30} y2={0} />
        </>
      );
  }
}

function PartAt({ part, x1, x2, y }: { part: Part; x1: number; x2: number; y: number }) {
  const cx = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={cx - 30} y2={y} />
      <line x1={cx + 30} y1={y} x2={x2} y2={y} />
      <g transform={`translate(${cx} ${y})`}>{partSymbol(part.type)}</g>
      {part.label && (
        <text {...textProps} x={cx} y={y - 24} textAnchor="middle">
          {part.label}
        </text>
      )}
    </g>
  );
}

function ParallelAt({ branches, x1, x2 }: { branches: Part[][]; x1: number; x2: number }) {
  const left = x1 + GROUP_PAD;
  const right = x2 - GROUP_PAD;
  const last = TOP + (branches.length - 1) * ROW;
  return (
    <g>
      <line x1={x1} y1={TOP} x2={left} y2={TOP} />
      <line x1={right} y1={TOP} x2={x2} y2={TOP} />
      <line x1={left} y1={TOP} x2={left} y2={last} />
      <line x1={right} y1={TOP} x2={right} y2={last} />
      {branches.map((branch, row) => {
        const step = (right - left) / branch.length;
        return branch.map((part, index) => (
          <PartAt
            key={`${row}-${index}`}
            part={part}
            x1={left + index * step}
            x2={left + (index + 1) * step}
            y={TOP + row * ROW}
          />
        ));
      })}
      {branches
        .slice(0, -1)
        .flatMap((_, row) =>
          [left, right].map((x) => (
            <circle
              key={`${row}-${x}`}
              cx={x}
              cy={TOP + row * ROW}
              r={3.5}
              fill={INK}
              stroke="none"
            />
          )),
        )}
    </g>
  );
}

function Source({ circuit, bottom }: { circuit: Circuit; bottom: number }) {
  const { type, label } = circuit.source;
  const cy = (TOP + bottom) / 2;
  const half = type === "battery" ? 7 : 18;
  return (
    <g>
      <line x1={LEFT} y1={TOP} x2={LEFT} y2={cy - half} />
      <line x1={LEFT} y1={cy + half} x2={LEFT} y2={bottom} />
      {type === "battery" ? (
        <>
          <line x1={LEFT - 18} y1={cy - 7} x2={LEFT + 18} y2={cy - 7} />
          <line x1={LEFT - 10} y1={cy + 7} x2={LEFT + 10} y2={cy + 7} strokeWidth={4} />
          <text {...textProps} x={LEFT + 24} y={cy - 10}>
            +
          </text>
        </>
      ) : (
        <>
          <circle cx={LEFT} cy={cy} r={18} />
          <path d={`M ${LEFT - 10} ${cy} q 5 -12 10 0 t 10 0`} />
        </>
      )}
      {label && (
        <text {...textProps} x={LEFT - 28} y={cy + 4} textAnchor="end">
          {label}
        </text>
      )}
    </g>
  );
}

/** Lays the circuit out as a rectangular loop: source on the left, parts along the top. */
function CircuitSvg({ circuit }: { circuit: Circuit }) {
  const widths = circuit.elements.map((element) =>
    element.type === "parallel"
      ? GROUP_PAD * 2 + Math.max(...element.branches.map((branch) => branch.length)) * SLOT
      : SLOT,
  );
  const depth = Math.max(
    0,
    ...circuit.elements.map((element) =>
      element.type === "parallel" ? (element.branches.length - 1) * ROW : 0,
    ),
  );
  const start = LEFT + LEAD;
  const end = start + widths.reduce((sum, width) => sum + width, 0);
  const right = end + LEAD;
  const bottom = TOP + Math.max(depth + 80, 170);
  const width = right + RIGHT_MARGIN;
  const height = bottom + 40;

  const offsets = widths.map(
    (_, index) => start + widths.slice(0, index).reduce((sum, width) => sum + width, 0),
  );
  const parts = circuit.elements.map((element, index) => {
    const x1 = offsets[index];
    const x2 = x1 + widths[index];
    return element.type === "parallel" ? (
      <ParallelAt key={index} branches={element.branches} x1={x1} x2={x2} />
    ) : (
      <PartAt key={index} part={element} x1={x1} x2={x2} y={TOP} />
    );
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={circuit.title ?? "Circuit diagram"}
      className="mx-auto h-auto w-full"
      style={{ maxWidth: width * 1.15 }}
    >
      <g stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1={LEFT} y1={TOP} x2={start} y2={TOP} />
        {parts}
        <line x1={end} y1={TOP} x2={right} y2={TOP} />
        <line x1={right} y1={TOP} x2={right} y2={bottom} />
        <line x1={right} y1={bottom} x2={LEFT} y2={bottom} />
        <Source circuit={circuit} bottom={bottom} />
      </g>
    </svg>
  );
}

interface CircuitDiagramProps {
  source: string;
  /** False while the answer is still streaming, when the description may be incomplete. */
  ready: boolean;
}

/** Draws a circuit from the model's description; shows the description if it isn't valid. */
export function CircuitDiagram({ source, ready }: CircuitDiagramProps) {
  const [zoomed, setZoomed] = useState(false);
  const circuit = useMemo(() => (ready ? parseCircuit(source) : null), [ready, source]);

  if (!ready) {
    return (
      <div className="not-prose my-5 grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-muted">
        Drawing circuit…
      </div>
    );
  }
  if (!circuit) {
    return (
      <pre>
        <code>{source}</code>
      </pre>
    );
  }

  const drawing = <CircuitSvg circuit={circuit} />;
  return (
    <figure className="not-prose my-5 rounded-xl border border-line bg-white p-4">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Enlarge circuit"
        className="block w-full cursor-zoom-in"
      >
        {drawing}
      </button>
      {circuit.title && (
        <figcaption className="mt-2 text-center text-sm text-ink-muted">{circuit.title}</figcaption>
      )}
      <Lightbox
        open={zoomed}
        onClose={() => setZoomed(false)}
        label={circuit.title ?? "Circuit diagram"}
      >
        <div className="w-[min(92vw,1100px)]">{drawing}</div>
      </Lightbox>
    </figure>
  );
}
