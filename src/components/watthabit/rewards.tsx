"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, BookOpen, Check, Crown, Lightbulb, Lock, Monitor, Plug, RotateCcw, Zap } from "lucide-react";
import type { Reward } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { BADGES, type BadgeId } from "@/lib/mock/rewards";
import { cn } from "@/lib/utils";
import { DemoQr } from "./demo-qr";

const BADGE_ICON: Record<BadgeId, typeof Zap> = { price: Zap, standby: Plug, sleep: Monitor, lights: Lightbulb, learn: BookOpen, full: Award };

export function BadgesRow({ earned }: { earned: Set<string> }) {
  const count = BADGES.filter((b) => earned.has(b.id)).length;
  return (
    <section aria-labelledby="badges-title" className="rounded-[22px] border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="badges-title" className="text-[15px] font-semibold">
          Free digital badges
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          {count}/{BADGES.length} earned
        </p>
      </div>
      <p className="text-xs text-muted-foreground">Everyone can earn these — no purchase, no partner.</p>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {BADGES.map((b) => {
          const on = earned.has(b.id);
          const Icon = BADGE_ICON[b.id];
          return (
            <li key={b.id} className="flex w-[68px] shrink-0 list-none flex-col items-center gap-1.5 text-center">
              <span
                className={cn("grid size-14 place-items-center rounded-full border-2", on ? "border-primary bg-accent text-primary" : "border-dashed border-input bg-muted text-muted-foreground/60")}
                aria-hidden="true"
              >
                {on ? <Icon className="size-6" /> : <Lock className="size-5" />}
              </span>
              <span className={cn("text-[11px] leading-tight", on ? "font-semibold" : "text-muted-foreground")}>{b.title}</span>
              <span className="sr-only">{on ? "earned" : "locked"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function VoucherCard({
  voucher,
  progress,
  goal,
  serverBacked,
  redeeming,
  message,
  onRedeem,
}: {
  voucher: Reward | null;
  progress: number;
  goal: number;
  serverBacked: boolean;
  redeeming: boolean;
  message: string | null;
  onRedeem: () => void;
}) {
  const remaining = Math.max(0, goal - progress);
  return (
    <article
      aria-labelledby="voucher-title"
      style={{ "--focus": "#ffffff" } as CSSProperties}
      className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(140deg,#0b5d55_0%,#0e7466_55%,#12806f_100%)] p-5 text-white shadow-[0_20px_44px_-24px_rgb(9_27_24/0.7)]"
    >
      <div className="pointer-events-none absolute -top-20 -right-16 size-52 rounded-full border-[22px] border-white/[0.07]" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/70 uppercase">Wallet</p>
          <h3 id="voucher-title" className="mt-1 text-xl leading-tight font-semibold">
            {voucher ? voucher.title.replace(/\s*\(DEMO — NOT REDEEMABLE\)\s*/, "") : "Your next reward"}
          </h3>
        </div>
        <strong className="shrink-0 rounded-md border border-white/50 bg-white/10 px-2 py-1 text-[10px] font-bold tracking-wide">DEMO — NOT REDEEMABLE</strong>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {voucher ? (
          <motion.div key="unlocked" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
            <div className="relative rounded-2xl bg-white p-2">
              <DemoQr code={voucher.code} className="size-24" />
              {voucher.isRedeemed && (
                <span className="absolute inset-0 grid place-items-center rounded-2xl bg-[rgb(11_93_85/0.78)] text-xs font-bold tracking-wide uppercase">Redeemed</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-white/70">Demo code</p>
              <p className="truncate font-mono text-sm tracking-wider">{voucher.code}</p>
              <Button className="mt-3 h-11 w-full rounded-full bg-white font-semibold text-primary hover:bg-white/90" onClick={onRedeem} disabled={voucher.isRedeemed || redeeming}>
                {voucher.isRedeemed ? (
                  <>
                    <Check aria-hidden="true" /> Redeemed (demo)
                  </>
                ) : redeeming ? (
                  "Redeeming…"
                ) : (
                  "Redeem (demo)"
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
            <Lock className="size-5 shrink-0 text-white/80" aria-hidden="true" />
            <p className="text-sm">
              Locked · {remaining} more {remaining === 1 ? "stamp" : "stamps"} to unlock a demo voucher ({progress}/{goal}).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="relative mt-4 text-[11px] leading-relaxed text-white/75" aria-live="polite">
        {message ?? (serverBacked ? "Demo voucher from the WattHabit demo server. No merchant, partner or real value." : "Illustration only. No merchant offer or partnership is in place.")}
      </p>
    </article>
  );
}

export function DemoResetRow({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-dashed border-input px-4 py-3">
      <p className="text-[11px] leading-snug text-muted-foreground">Browser-local demo progress. Reset starts this browser again; server reward history stays unchanged.</p>
      <Button variant="outline" className="h-10 shrink-0 rounded-full px-3" onClick={onReset}>
        <RotateCcw aria-hidden="true" /> Reset browser demo
      </Button>
    </div>
  );
}

export function PlusCard() {
  return (
    <article aria-labelledby="plus-title" className="rounded-[22px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Crown className="size-4 text-primary" aria-hidden="true" />
          <span id="plus-title">WattHabit Plus</span>
        </span>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">Coming soon — proposed $5/mo</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Price advice, reminders, challenges and badges stay free. A planned Plus tier could add partner perks like café or campus discounts — none exist today.
      </p>
      <p className="mt-3 text-xs font-semibold">No subscription or payment is available.</p>
    </article>
  );
}
