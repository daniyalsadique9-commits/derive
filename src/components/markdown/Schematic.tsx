"use client";

import { useState, type ReactNode } from "react";
import { Lightbox } from "@/components/ui/Lightbox";
import { BatteryPackSchematic } from "./schematics/BatteryPackSchematic";

/** Checked circuit drawings, added to answers by name rather than drawn by a model. */
const SCHEMATICS: Record<string, { title: string; drawing: ReactNode }> = {
  "laptop-battery-pack": {
    title: "Laptop battery pack: three cells in series, protected and monitored by the BMS chip",
    drawing: <BatteryPackSchematic />,
  },
};

export function Schematic({ name }: { name: string }) {
  const [zoomed, setZoomed] = useState(false);
  const schematic = Object.hasOwn(SCHEMATICS, name) ? SCHEMATICS[name] : null;

  if (!schematic) {
    return (
      <p className="not-prose my-5 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-muted">
        This diagram could not be drawn. Ask again and it will be redrawn.
      </p>
    );
  }

  return (
    <figure className="not-prose my-5 rounded-xl border border-line bg-white p-4">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Enlarge circuit"
        className="block w-full cursor-zoom-in"
      >
        {schematic.drawing}
      </button>
      <figcaption className="mt-2 text-center text-sm text-ink-muted">{schematic.title}</figcaption>
      <Lightbox open={zoomed} onClose={() => setZoomed(false)} label={schematic.title}>
        <div className="w-[min(92vw,1300px)]">{schematic.drawing}</div>
      </Lightbox>
    </figure>
  );
}
