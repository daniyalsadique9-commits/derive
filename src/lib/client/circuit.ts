import { z } from "zod";

export const PART_TYPES = [
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
] as const;

export const SOURCE_TYPES = ["battery", "ac_source"] as const;

const part = z.object({
  type: z.enum(PART_TYPES),
  label: z.string().max(40).optional(),
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
  source: z.object({ type: z.enum(SOURCE_TYPES), label: z.string().max(40).optional() }),
  elements: z
    .array(z.union([part, parallel]))
    .min(1)
    .max(8),
});

export type Part = z.infer<typeof part>;
export type Circuit = z.infer<typeof circuitSchema>;

export function parseCircuit(source: string): Circuit | null {
  try {
    const parsed = circuitSchema.safeParse(JSON.parse(source));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
