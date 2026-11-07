"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, Flame, Lightbulb, Monitor, Plug, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChallengeCardModel = {
  id: string;
  kind: "price" | "habit" | "learn";
  title: string;
  line: string;
  estimateLabel: string;
  estimate: string;
  accepted: boolean;
  done: boolean;
  canAccept: boolean;
  canComplete: boolean;
  /** Shown when accepting or completing isn't possible yet (no useful window / window is tomorrow). */
  note: string | null;
  acceptedNote: string;
};

const ICONS: Record<string, typeof Zap> = { price: Zap, "standby-30w": Plug, "computer-sleep-60w": Monitor, "lights-15w": Lightbulb, "learn-shifting": BookOpen };

function ChallengeCard({ c, onAccept, onDone, onWhy }: { c: ChallengeCardModel; onAccept: () => void; onDone: () => void; onWhy: () => void }) {
  const Icon = ICONS[c.id] ?? Zap;
  return (
    <li className={cn("list-none rounded-[22px] border bg-card p-4 transition-colors", c.done ? "border-primary/25" : "border-border")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full",
            c.done ? "bg-primary text-primary-foreground" : c.kind === "price" ? "bg-energy text-energy-ink" : "bg-accent text-primary",
          )}
          aria-hidden="true"
        >
          {c.done ? <Check className="size-5" /> : <Icon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">{c.title}</h3>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{c.line}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted px-3 py-2">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{c.estimateLabel}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{c.estimate}</p>
      </div>

      {c.kind === "learn" && (
        <details className="group mt-2 rounded-xl px-1 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
            Read the 20-second lesson
            <span className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="space-y-2 pb-2 leading-relaxed text-muted-foreground">
            <p>A wash at 18:00 and a wash at 22:00 use about the same kWh. Shifting changes when you use energy, not how much.</p>
            <p>It lowers cost only on a spot-price contract. If electricity is in your rent or you have a fixed price, your bill likely won&apos;t change.</p>
            <p>Real kWh reductions come from habits like switching off standby or letting a computer sleep.</p>
          </div>
        </details>
      )}

      <div className="mt-3">
        <AnimatePresence mode="wait" initial={false}>
          {c.done ? (
            <motion.p key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Check className="size-4" aria-hidden="true" /> Done today · stamp added
            </motion.p>
          ) : !c.accepted && !c.canAccept ? (
            <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{c.note}</p>
              <Button variant="outline" className="h-11 shrink-0 rounded-full px-4" onClick={onWhy}>
                <Sparkles aria-hidden="true" /> Why?
              </Button>
            </motion.div>
          ) : c.accepted ? (
            <motion.div key="accepted" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <Check className="size-3.5" aria-hidden="true" /> {c.acceptedNote}
              </span>
              {c.canComplete ? (
                <Button className="ml-auto h-11 rounded-full px-5 font-semibold" onClick={onDone}>
                  I did it
                </Button>
              ) : (
                c.note && <p className="w-full text-xs text-muted-foreground">{c.note}</p>
              )}
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <Button className="h-11 flex-1 rounded-full font-semibold" onClick={onAccept}>
                Accept
              </Button>
              <Button variant="outline" className="h-11 rounded-full px-4" onClick={onWhy}>
                <Sparkles aria-hidden="true" /> Why?
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

export function ChallengesSection({
  cards,
  streak,
  doneToday,
  onAccept,
  onDone,
  onWhy,
}: {
  cards: ChallengeCardModel[];
  streak: number;
  doneToday: number;
  onAccept: (id: string) => void;
  onDone: (id: string) => void;
  onWhy: (id: string) => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-[22px] border border-border bg-card p-4">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", streak > 0 ? "bg-accent text-primary" : "bg-muted text-muted-foreground")} aria-hidden="true">
          <Flame className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">{streak > 0 ? `${streak}-day streak` : "Start a streak today"}</p>
          <p className="text-xs text-muted-foreground">One completed challenge a day keeps it going.</p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          <span className="block text-lg font-semibold text-foreground tabular-nums">
            {doneToday}/{cards.length}
          </span>
          done today
        </p>
      </div>
      <ul className="space-y-3">
        {cards.map((c) => (
          <ChallengeCard key={c.id} c={c} onAccept={() => onAccept(c.id)} onDone={() => onDone(c.id)} onWhy={() => onWhy(c.id)} />
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Self-reported. Each challenge counts once per Stockholm day. Estimates are modeled with the stated assumptions, never measured.
      </p>
    </>
  );
}
