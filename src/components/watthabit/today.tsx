"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Bell, BellRing, BookOpen, Check, Info, Lightbulb, Monitor, Plug, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { DataStatus, Housing } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LABEL, type HabitChallenge } from "@/lib/mock/challenges";
import { formatStockholmDay, formatStockholmTime, stockholmHour } from "@/lib/mock/time";
import { cn } from "@/lib/utils";
import { isDemoDay, isUsable, windowText, type DayPlan, type PriceDay, type PriceLevel, type ReminderRow, type Suggestion } from "./advice";
import { ASSUMED_KWH } from "./price-window";
import { PriceStrip } from "./price-strip";

/* ---------- Greeting + live price status ---------- */

function greetingFor(nowMs: number | null): string {
  if (nowMs === null) return "Hello";
  const hour = stockholmHour(nowMs);
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const STATUS_LABEL: Record<DataStatus, string> = { live: "Live", cached: "Cached", demo: "Demo", unavailable: "Unavailable" };
const LEVEL_STYLE: Record<PriceLevel, string> = {
  cheap: "border-energy-strong/40 bg-energy text-energy-ink",
  normal: "border-border bg-card text-foreground",
  peak: "border-peak/40 bg-peak-soft text-peak-ink",
};

export function TodayHeader({ nowMs, today, now }: { nowMs: number | null; today: PriceDay | null; now: { level: PriceLevel; price: number } | null }) {
  const status: DataStatus | null = today ? (today.fallback ? "demo" : today.data.status) : null;
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {nowMs === null ? "Today" : formatStockholmDay(nowMs)}
      </p>
      <h1 id="home-title" className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight">
        {greetingFor(nowMs)}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        {today === null ? (
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground/60" aria-hidden="true" />
            Price feed not connected · checking…
          </span>
        ) : now ? (
          <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", LEVEL_STYLE[now.level])}>
            {now.level === "cheap" ? <Zap className="size-3.5" aria-hidden="true" /> : now.level === "peak" ? <Info className="size-3.5" aria-hidden="true" /> : null}
            Now: {now.level} · {now.price.toFixed(2)} SEK/kWh
          </span>
        ) : (
          <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">Today&apos;s prices unavailable</span>
        )}
        {status && (
          <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold tracking-wider uppercase", status === "live" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
      {today?.fallback && <p className="mt-2 text-xs text-muted-foreground">Price feed not connected — showing a demo price curve, not market data.</p>}
    </div>
  );
}

/* ---------- Hero: today's advice, styled like a smart notification ---------- */

const HABIT_ICON: Record<HabitChallenge["id"], typeof Plug> = { "standby-30w": Plug, "computer-sleep-60w": Monitor, "lights-15w": Lightbulb };

const HOUSING_NOTE: Record<Housing, string> = {
  separate: "Worth it if your contract follows spot prices (timpris).",
  included: "Electricity is in your rent, so your bill won't change — still a good off-peak habit.",
  unknown: "Saves money only on a spot-price contract. Not sure? Tap Why?",
};

export type HeroState = { accepted: boolean; done: boolean };

export function AdviceCard({
  suggestion,
  loading,
  state,
  housing,
  onAccept,
  onSkip,
  onWhy,
  onDone,
  onShowSkipped,
  hasSkipped,
}: {
  suggestion: Suggestion | null;
  loading: boolean;
  state: HeroState;
  housing: Housing;
  onAccept: () => void;
  onSkip: () => void;
  onWhy: () => void;
  onDone: () => void;
  onShowSkipped: () => void;
  hasSkipped: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-[24px] border border-border bg-card p-5" aria-busy="true" aria-label="Loading today's advice">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="mt-5 h-12 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <article className="rounded-[24px] border border-border bg-card p-5 text-center" aria-labelledby="advice-title">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent text-primary" aria-hidden="true">
          <Check className="size-5" />
        </span>
        <h2 id="advice-title" className="mt-3 text-lg font-semibold">
          You&apos;re all caught up
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Nice. New suggestions arrive with tomorrow&apos;s prices.</p>
        {hasSkipped && (
          <Button variant="outline" className="mt-4 h-11 rounded-full px-5" onClick={onShowSkipped}>
            Show skipped suggestions
          </Button>
        )}
      </article>
    );
  }

  const isPrice = suggestion.kind === "price";
  const tomorrow = isPrice && suggestion.plan.day === "tomorrow";
  let eyebrow: string;
  let title: string;
  let big: string | null = null;
  let why: string;
  let estimate: string;
  let note: string | null = null;
  let Icon: typeof Plug = Zap;

  if (suggestion.kind === "price") {
    const { plan } = suggestion.plan;
    const label = ACTIVITY_LABEL[suggestion.activity];
    eyebrow = "Happy hour";
    title = `${label.name} happy hour ${suggestion.plan.dayWord}`;
    big = windowText(plan);
    why = `Spot price ≈ ${plan.cheapest.avgSekPerKwh.toFixed(2)} SEK/kWh vs ${plan.baseline.avgSekPerKwh.toFixed(2)} if you start at ${formatStockholmTime(plan.baseline.startsAt)}.${isDemoDay(suggestion.plan.source) ? " Demo prices." : ""}`;
    estimate = `Estimate: ≈ ${plan.estimatedDiffSek.toFixed(2)} SEK lower spot cost per ${label.unit} (assumes ~${ASSUMED_KWH} kWh, before VAT and fees). Same kWh, better time.`;
    note = HOUSING_NOTE[housing];
  } else if (suggestion.kind === "habit") {
    const h = suggestion.habit;
    Icon = HABIT_ICON[h.id];
    eyebrow = "Habit challenge";
    title = h.title;
    why = h.line;
    estimate = `Modeled estimate: ≈ ${h.kwhPerDay.toFixed(2)} kWh less per day (${h.assumption}). Self-reported, not measured.`;
  } else {
    Icon = BookOpen;
    eyebrow = "Learn";
    title = "Shifting ≠ saving kWh";
    why = "Moving a load changes when you use electricity, not how much.";
    estimate = "A wash at 22:00 uses about the same kWh as at 18:00 — only the price per kWh can differ.";
  }

  return (
    <article
      className="relative overflow-hidden rounded-[24px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_32_29/0.05),0_18px_40px_-24px_rgb(16_32_29/0.35)]"
      aria-labelledby="advice-title"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground" aria-hidden="true">
          <Zap className="size-3.5" />
        </span>
        <span className="font-medium text-foreground">WattHabit</span>
        <span aria-hidden="true">·</span>
        <span>Today&apos;s advice</span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isPrice ? "bg-energy text-energy-ink" : "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2 id="advice-title" className="mt-2.5 text-[20px] leading-snug font-semibold tracking-tight">
            {title}
          </h2>
          {big && <p className="mt-0.5 text-[30px] leading-tight font-semibold tracking-tight tabular-nums">{big}</p>}
        </div>
      </div>

      <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{why}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{estimate}</p>
      {note && (
        <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {note}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {state.accepted ? (
          <motion.div key="accepted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground" role="status">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
              </motion.span>
              {suggestion.kind === "price"
                ? `Reminder set for ${tomorrow ? "tomorrow " : ""}${suggestion.plan.reminderAt}`
                : suggestion.kind === "habit"
                  ? "Accepted for today"
                  : "Read it, then stamp it"}
            </p>
            {tomorrow ? (
              <p className="mt-3 text-sm text-muted-foreground">Come back tomorrow to stamp it — or pick a habit challenge today.</p>
            ) : (
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <Button className="h-12 rounded-full text-[15px] font-semibold" onClick={onDone}>
                  I did it — add a stamp
                </Button>
                <Button variant="outline" className="h-12 rounded-full px-4" onClick={onWhy}>
                  <Sparkles aria-hidden="true" /> Why?
                </Button>
              </div>
            )}
            {tomorrow && (
              <Button variant="outline" className="mt-3 h-11 rounded-full px-4" onClick={onSkip}>
                Next suggestion
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
            <Button className="h-12 rounded-full text-[15px] font-semibold" onClick={onAccept}>
              Accept
            </Button>
            <Button variant="outline" className="h-12 rounded-full" onClick={onSkip}>
              Skip
            </Button>
            <Button variant="outline" className="h-12 rounded-full" onClick={onWhy}>
              <Sparkles aria-hidden="true" /> Why?
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ---------- Thin 24h price strip ---------- */

export function PriceStripCard({ plan, today, nowMs, onRetry, onUseDemo }: { plan: DayPlan | null; today: PriceDay | null; nowMs: number | null; onRetry: () => void; onUseDemo: () => void }) {
  if (today === null) {
    return <div className="h-[92px] animate-pulse rounded-[22px] border border-border bg-card" aria-hidden="true" />;
  }
  const source = plan?.source ?? today;
  const unavailableText = today.data.error ?? "Prices for today aren't published yet.";
  const showUnavailable = !plan && !isUsable(today);
  return (
    <section aria-labelledby="strip-title" className="rounded-[22px] border border-border bg-card px-4 pt-3.5 pb-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="strip-title" className="text-sm font-semibold">
          {plan?.day === "tomorrow" ? "Tomorrow's prices" : "Today's prices"}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground" aria-hidden="true">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-energy-strong" /> Happy hour
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-peak" /> Peak
          </span>
        </div>
      </div>
      {showUnavailable ? (
        <div className="mt-2 text-sm">
          <p className="text-muted-foreground">{unavailableText}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="h-10 rounded-full" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> Retry
            </Button>
            <Button variant="ghost" className="h-10 rounded-full" onClick={onUseDemo}>
              Use demo prices
            </Button>
          </div>
        </div>
      ) : (
        <PriceStrip intervals={plan?.list ?? today.data.intervals} highlight={plan?.useful && plan.plan ? plan.plan.cheapest : null} nowMs={plan?.day === "tomorrow" ? null : nowMs} />
      )}
      <a
        href={source.data.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-9 items-center gap-1 text-[11px] text-muted-foreground underline-offset-4 hover:underline"
      >
        Source: Elpriset just nu · {source.fallback ? "demo" : source.data.status} · Europe/Stockholm
        <ArrowUpRight className="size-3" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </section>
  );
}

/* ---------- Upcoming reminders ---------- */

export function UpcomingReminders({ rows, onPreview }: { rows: ReminderRow[]; onPreview: () => void }) {
  return (
    <section aria-labelledby="reminders-title" className="rounded-[22px] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="reminders-title" className="text-sm font-semibold">
          Upcoming reminders
        </h2>
        <Button variant="ghost" className="h-10 rounded-full px-3 text-primary" onClick={onPreview}>
          <BellRing aria-hidden="true" /> Preview reminder
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No reminders yet. Accept a challenge to get an in-app reminder.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-primary" aria-hidden="true">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular-nums">{r.when}</span> · {r.detail}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">{r.tag}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">In-app reminders while WattHabit is open. Push notifications are coming later.</p>
    </section>
  );
}
