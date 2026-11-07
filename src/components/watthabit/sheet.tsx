"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside `ref` while active, closes on Escape (if handler given),
 * focuses `[data-autofocus]` (or the first focusable) on open and restores focus on close.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
    const initial = node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? node;
    initial.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && escapeRef.current) {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (!node.contains(current)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Modal sheet: bottom (default) or top. role=dialog, aria-modal, focus trap, Esc to close. */
export function Sheet({
  open,
  onClose,
  labelledBy,
  side = "bottom",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  side?: "bottom" | "top";
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);
  const offscreen = side === "bottom" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" key="sheet-root">
          <motion.div
            className="absolute inset-0 bg-[rgb(9_27_24/0.42)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ y: offscreen }}
            animate={{ y: 0 }}
            exit={{ y: offscreen }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
            className={cn(
              "absolute inset-x-0 mx-auto flex w-full max-w-[440px] flex-col bg-card shadow-[0_-12px_40px_-12px_rgb(9_27_24/0.35)] outline-none",
              side === "bottom"
                ? "bottom-0 max-h-[88dvh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]"
                : "top-0 max-h-[80dvh] rounded-b-[28px] pt-[env(safe-area-inset-top)]",
              className,
            )}
          >
            {side === "bottom" && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
