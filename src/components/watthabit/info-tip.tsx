"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** (i) button that reveals assumptions/disclaimers on tap or Enter. Esc or outside tap closes. */
export function InfoTip({ label, children, tone = "default" }: { label: string; children: ReactNode; tone?: "default" | "inverse" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn("grid size-9 place-items-center rounded-full", tone === "inverse" ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute top-full right-0 z-20 mt-1 block w-64 max-w-[calc(100vw-48px)] rounded-xl border border-border bg-card p-3 text-left text-xs leading-relaxed font-normal text-foreground shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
