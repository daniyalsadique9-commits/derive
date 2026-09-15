import { z } from "zod";

const PART_TYPES = [
  "resistor",
  "capacitor",
  "inductor",
  "diode",
  "led",
  "lamp",
  "switch",
  "fuse",
  "ammeter",
  "voltmeter",
  "galvanometer",
  "battery",
  /** Anything without a standard symbol here, such as a chip or connector: a labelled box. */
  "block",
] as const;

type PartType = (typeof PART_TYPES)[number];

const SOURCE_TYPES = ["battery", "ac_source"] as const;

const MAX_ELEMENTS = 12;
const MAX_LABEL_CHARS = 40;

const part = z.object({
  type: z.enum(PART_TYPES),
  label: z.string().max(MAX_LABEL_CHARS).optional(),
});

const parallel = z.object({
  type: z.literal("parallel"),
  branches: z.array(z.array(part).min(1).max(4)).min(2).max(4),
});

/**
 * A simple circuit described by the model and drawn by our own code: a source on the left and
 * parts in series around the loop, with parallel groups of up to four branches.
 */
export const circuitSchema = z.object({
  title: z.string().max(80).optional(),
  source: z.object({
    type: z.enum(SOURCE_TYPES),
    label: z.string().max(MAX_LABEL_CHARS).optional(),
  }),
  elements: z
    .array(z.union([part, parallel]))
    .min(1)
    .max(MAX_ELEMENTS),
});

export type Part = z.infer<typeof part>;
export type Circuit = z.infer<typeof circuitSchema>;

/** Other names models use for parts we can draw. Anything unknown is drawn as a labelled box. */
const ALIASES: Record<string, PartType> = {
  cell: "battery",
  bulb: "lamp",
  light: "lamp",
  key: "switch",
  coil: "inductor",
  meter: "ammeter",
};

const text = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const shorten = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

function toPart(raw: unknown): Part | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = text(record.type).toLowerCase();
  const type: PartType = (PART_TYPES as readonly string[]).includes(name)
    ? (name as PartType)
    : (ALIASES[name] ?? "block");
  const label =
    [text(record.label), text(record.value ?? record.voltage)].filter(Boolean).join(" ") ||
    (type === "block" ? name.toUpperCase() : "");
  return label ? { type, label: shorten(label, MAX_LABEL_CHARS) } : { type };
}

/** Drops a "connections" list, which isn't drawn and which models often write as broken JSON. */
function withoutConnections(source: string): string {
  const start = source.search(/,?\s*"connections"\s*:\s*\[/);
  if (start === -1) return source;
  let depth = 0;
  for (let index = source.indexOf("[", start); index < source.length; index++) {
    if (source[index] === "[") depth++;
    else if (source[index] === "]" && --depth === 0) {
      return source.slice(0, start) + source.slice(index + 1);
    }
  }
  return `${source.slice(0, start)}\n}`;
}

function readJson(source: string): unknown {
  for (const candidate of [source, withoutConnections(source)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next, repaired form.
    }
  }
  return null;
}

function toElements(raw: unknown): Circuit["elements"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((element): Circuit["elements"] => {
      const record = element as Record<string, unknown> | null;
      if (record?.type === "parallel" && Array.isArray(record.branches)) {
        const branches = record.branches
          .filter(Array.isArray)
          .map((branch) =>
            (branch as unknown[])
              .map(toPart)
              .filter((item): item is Part => item !== null)
              .slice(0, 4),
          )
          .filter((branch) => branch.length > 0)
          .slice(0, 4);
        // A "parallel" group with a single branch is just parts in series.
        return branches.length >= 2 ? [{ type: "parallel", branches }] : branches.flat();
      }
      const item = toPart(element);
      return item ? [item] : [];
    })
    .slice(0, MAX_ELEMENTS);
}

/**
 * Reads a circuit described by the model, leniently: unknown parts become labelled boxes and
 * anything that isn't drawn is ignored. Returns null only when there is nothing to draw.
 */
export function parseCircuit(source: string): Circuit | null {
  const raw = readJson(source);
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const sourceRecord = (record.source ?? {}) as Record<string, unknown>;
  const parsed = circuitSchema.safeParse({
    title: shorten(text(record.title), 80) || undefined,
    source: {
      type: /^ac/.test(text(sourceRecord.type).toLowerCase()) ? "ac_source" : "battery",
      label: shorten(text(sourceRecord.label), MAX_LABEL_CHARS) || undefined,
    },
    elements: toElements(record.elements),
  });
  return parsed.success ? parsed.data : null;
}
