"use client";

import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, Gift, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InboxItem } from "./advice";
import { Sheet } from "./sheet";

export type BannerNotice = { id: number; kind: "happy-hour" | "habit"; title: string; body: string };

/** Phone-style banner sliding from the top. In-app preview only — no push is sent. */
export function ReminderBanner({ notice, bannerRef, onView, onClose }: { notice: BannerNotice | null; bannerRef: RefObject<HTMLDivElement | null>; onView: () => void; onClose: () => void }) {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.id}
          ref={bannerRef}
          role="region"
          aria-label="In-app reminder preview"
          initial={{ y: -140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -140, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed inset-x-0 top-0 z-[60] mx-auto w-full max-w-[440px] px-3 pt-[max(env(safe-area-inset-top),10px)]"
        >
          <div className="rounded-[22px] border border-white/60 bg-white/95 p-3.5 shadow-[0_18px_40px_-12px_rgb(9_27_24/0.4)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary", notice.kind === "happy-hour" ? "text-energy" : "text-primary-foreground")} aria-hidden="true">
                <Zap className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold tracking-wide uppercase">WattHabit</span>
                  <span>now</span>
                </p>
                <p className="mt-0.5 text-[15px] leading-snug font-semibold">{notice.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-foreground/75">{notice.body}</p>
              </div>
              <button type="button" onClick={onClose} className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Dismiss reminder">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3 pl-12">
              <p className="text-[11px] text-muted-foreground">In-app reminder preview — no push sent</p>
              <Button size="sm" className="h-9 rounded-full px-4" onClick={onView}>
                View
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InboxButton({ unread, onOpen }: { unread: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative grid size-11 place-items-center rounded-full text-foreground hover:bg-muted"
      aria-label={unread > 0 ? `Reminders inbox, ${unread} unread` : "Reminders inbox"}
      aria-haspopup="dialog"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full border-2 border-background bg-[#e5484d]" aria-hidden="true" />}
    </button>
  );
}

export function InboxSheet({ open, items, onClose, onPreview }: { open: boolean; items: InboxItem[]; onClose: () => void; onPreview: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="inbox-title" side="top">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 id="inbox-title" className="text-lg font-semibold">
          Reminders
        </h2>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Close reminders">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="overflow-y-auto px-5 pb-5">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nothing yet. Happy-hour reminders appear here once prices load.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-primary" aria-hidden="true">
                  {item.kind === "reward" ? <Gift className="size-4" /> : <Zap className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" className="mt-2 h-11 w-full rounded-full" onClick={onPreview}>
          <BellRing aria-hidden="true" /> Preview reminder banner
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">In-app reminders only. Push notifications are coming later.</p>
      </div>
    </Sheet>
  );
}
