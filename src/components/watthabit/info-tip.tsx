"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Position = { left: number; top: number };

/** (i) button that reveals assumptions/disclaimers on tap or Enter. Esc or outside tap closes. */
export function InfoTip({ label, children, tone = "default" }: { label: string; children: ReactNode; tone?: "default" | "inverse" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const popup = popoverRef.current?.getBoundingClientRect();
      const margin = 12;
      const width = popup?.width ?? Math.min(256, window.innerWidth - margin * 2);
      const height = popup?.height ?? 80;
      const left = Math.max(margin, Math.min(trigger.left + trigger.width / 2 - width / 2, window.innerWidth - width - margin));
      const below = trigger.bottom + 8;
      const top = below + height <= window.innerHeight - margin ? below : Math.max(margin, trigger.top - height - 8);
      setPosition({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={triggerRef} className="inline-flex shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={cn("grid size-11 place-items-center rounded-full", tone === "inverse" ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <span
          ref={popoverRef}
          id={id}
          role="note"
          style={{ left: position?.left ?? 12, top: position?.top ?? 12, visibility: position ? "visible" : "hidden" }}
          className="fixed z-[100] block w-64 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card p-3 text-left text-xs leading-relaxed font-normal text-foreground shadow-lg"
        >
          {children}
        </span>,
        document.body,
      )}
    </span>
  );
}
