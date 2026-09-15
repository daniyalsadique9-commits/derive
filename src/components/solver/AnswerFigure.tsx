"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";

/** A graph in an answer; opens full screen when clicked. */
export function AnswerFigure({ src }: { src: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Enlarge graph"
        className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line bg-white"
      >
        <Image
          src={src}
          alt="Graph for this answer"
          width={1200}
          height={900}
          unoptimized
          className="h-auto w-full"
        />
      </button>
      <Lightbox open={zoomed} onClose={() => setZoomed(false)} label="Graph">
        <Image
          src={src}
          alt=""
          width={1600}
          height={1200}
          unoptimized
          className="h-auto max-h-[85dvh] w-auto max-w-[92vw]"
        />
      </Lightbox>
    </>
  );
}
