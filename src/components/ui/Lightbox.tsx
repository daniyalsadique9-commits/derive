"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the figure being shown. */
  label: string;
  children: ReactNode;
}

/** Shows a figure full screen. Closes with the close button, Escape, or a click outside it. */
export function Lightbox({ open, onClose, label, children }: LightboxProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full overflow-auto rounded-xl bg-white p-3 shadow-2xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
