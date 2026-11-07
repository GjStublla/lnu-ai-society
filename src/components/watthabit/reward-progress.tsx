"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";
import { Mug } from "./mug";

export function StampDots({ progress, goal, exampleStamps, size = "sm" }: { progress: number; goal: number; exampleStamps: number; size?: "sm" | "lg" }) {
  return (
    <ol className={cn("flex items-center", size === "sm" ? "gap-1.5" : "gap-2.5")} aria-label={`${progress} of ${goal} stamps`}>
      {Array.from({ length: goal }, (_, i) => {
        const filled = i < progress;
        const example = i < exampleStamps;
        return (
          <li key={i} className="list-none">
            <motion.span
              initial={false}
              animate={{ scale: filled ? [1.35, 1] : 1 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "grid place-items-center rounded-full border font-semibold tabular-nums",
                size === "sm" ? "size-3" : "size-8 text-[11px]",
                filled ? (example ? "border-primary/30 bg-primary/25 text-primary" : "border-primary bg-primary text-primary-foreground") : "border-dashed border-input bg-transparent text-muted-foreground",
              )}
            >
              <span className="sr-only">{filled ? (example ? "Example stamp" : "Earned stamp") : "Empty stamp"}</span>
              {size === "lg" && <span aria-hidden="true">{i + 1}</span>}
            </motion.span>
          </li>
        );
      })}
    </ol>
  );
}

/** One stamp falling into the mug after "I did it" (keyed by dropKey). */
function StampDrop({ dropKey }: { dropKey: number }) {
  if (dropKey === 0) return null;
  return (
    <motion.span
      key={dropKey}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-1/2 z-10 -ml-3 grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow"
      initial={{ y: -36, opacity: 0, scale: 1.2 }}
      animate={{ y: [-36, 18, 26], opacity: [0, 1, 0], scale: [1.2, 1, 0.5] }}
      transition={{ duration: 0.9, ease: "easeIn" }}
    >
      ✓
    </motion.span>
  );
}

const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return { x: Math.cos(angle) * 64, y: Math.sin(angle) * 64, color: i % 3 === 0 ? "#0b5d55" : i % 3 === 1 ? "#5fcab6" : "#a7e3d6" };
});

/** Short celebration on reaching the goal. Hidden for reduced motion. */
function Celebration({ celebrateKey }: { celebrateKey: number }) {
  const reduce = useReducedMotion();
  if (celebrateKey === 0 || reduce) return null;
  return (
    <span key={celebrateKey} className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {BURST.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 size-2 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

type RewardProgressProps = {
  progress: number;
  goal: number;
  exampleStamps: number;
  dropKey: number;
  celebrateKey: number;
};

/** Compact Today widget — a small part of the screen, not the hero. */
export function RewardWidget({ progress, goal, exampleStamps, dropKey, celebrateKey }: RewardProgressProps) {
  const full = progress >= goal;
  return (
    <section aria-labelledby="reward-widget-title" className="flex items-center gap-4 rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgb(16_32_29/0.04)]">
      <div className="relative w-[72px] shrink-0">
        <Mug progress={progress} goal={goal} />
        <StampDrop dropKey={dropKey} />
        <Celebration celebrateKey={celebrateKey} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 id="reward-widget-title" className="text-[15px] font-semibold">
          {full ? "Reward unlocked" : `${progress}/${goal} to next reward`}
        </h2>
        <p className="sr-only" aria-live="polite">
          {progress} of {goal} stamps.
        </p>
        <div className="mt-2">
          <StampDots progress={progress} goal={goal} exampleStamps={exampleStamps} />
        </div>
      </div>
      <a href="#rewards" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Open rewards">
        <ChevronRight className="size-5" aria-hidden="true" />
      </a>
    </section>
  );
}

/** Larger mug for the Rewards tab. */
export function RewardHero({ progress, goal, exampleStamps, dropKey, celebrateKey }: RewardProgressProps) {
  const full = progress >= goal;
  return (
    <div className="flex flex-col items-center rounded-[26px] border border-border bg-card px-5 pt-6 pb-5 text-center">
      <div className="relative w-36">
        <Mug progress={progress} goal={goal} />
        <StampDrop dropKey={dropKey} />
        <Celebration celebrateKey={celebrateKey} />
      </div>
      <p className="mt-3 flex items-center gap-1 text-lg font-semibold tracking-tight">
        {full ? "Reward unlocked" : `${progress}/${goal} to next reward`}
        <InfoTip label="About stamps">Stamps count self-reported participation, not measured savings. The first {exampleStamps} are example stamps.</InfoTip>
      </p>
      <div className="mt-2">
        <StampDots progress={progress} goal={goal} exampleStamps={exampleStamps} size="lg" />
      </div>
    </div>
  );
}
