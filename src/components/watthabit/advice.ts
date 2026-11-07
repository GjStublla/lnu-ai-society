// Pure derivations for the Today screen. No React, no hidden clock reads:
// callers pass `nowMs` explicitly.
import type { PriceInterval, PricesResponse } from "@/types/contracts";
import { ACTIVITY_LABEL, HABITS, LEARN_CHALLENGE, PRICE_CHALLENGE_ID, type HabitChallenge } from "@/lib/mock/challenges";
import { formatStockholmTime, parseHHmm, prevDate, stockholmMinutesOfDay } from "@/lib/mock/time";
import type { Activity } from "@/lib/mock/types";
import { ACTIVITY_DURATION_MIN, planQuest, type QuestPlan } from "./price-window";

export type PriceDay = { data: PricesResponse; fallback: boolean };
export type PriceLevel = "cheap" | "normal" | "peak";

export function isUsable(day: PriceDay | null | undefined): day is PriceDay {
  return !!day && day.data.status !== "unavailable" && day.data.intervals.length > 0;
}

export function isDemoDay(day: PriceDay): boolean {
  return day.fallback || day.data.status === "demo";
}

/** Day-relative thresholds: bottom third = cheap, top quarter = peak. */
export function priceThresholds(intervals: PriceInterval[]): { low: number; high: number } {
  const sorted = intervals.map((i) => i.sekPerKwh).filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return { low: 0, high: 0 };
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
  return { low: q(0.33), high: q(0.75) };
}

export function levelOf(price: number, t: { low: number; high: number }): PriceLevel {
  if (price <= t.low) return "cheap";
  if (price >= t.high) return "peak";
  return "normal";
}

export function currentLevel(day: PriceDay | null, nowMs: number | null): { level: PriceLevel; price: number } | null {
  if (!isUsable(day) || nowMs === null) return null;
  const current = day.data.intervals.find((i) => Date.parse(i.startsAt) <= nowMs && nowMs < Date.parse(i.endsAt));
  if (!current) return null;
  return { level: levelOf(current.sekPerKwh, priceThresholds(day.data.intervals)), price: current.sekPerKwh };
}

export type DayPlan = {
  day: "today" | "tomorrow";
  source: PriceDay;
  list: PriceInterval[];
  plan: QuestPlan | null;
  /** True when the cheapest window is meaningfully cheaper than starting right away. */
  useful: boolean;
  dayWord: "today" | "tonight" | "tomorrow";
  reminderAt: string | null; // HH:mm, 15 min before the window
};

export type UsefulPlan = DayPlan & { plan: QuestPlan; reminderAt: string };

const MIN_USEFUL_DIFF_SEK = 0.05;

function buildDayPlan(day: DayPlan["day"], source: PriceDay, startMin: number, durationMin: number, nowMs: number | null): DayPlan {
  const { list, plan } = planQuest(source.data.intervals, startMin, durationMin, new Date(nowMs ?? Date.now()));
  const startMinutes = plan ? stockholmMinutesOfDay(plan.cheapest.startsAt) : 0;
  return {
    day,
    source,
    list,
    plan,
    useful: !!plan && plan.estimatedDiffSek >= MIN_USEFUL_DIFF_SEK,
    dayWord: day === "tomorrow" ? "tomorrow" : startMinutes >= 17 * 60 ? "tonight" : "today",
    reminderAt: plan ? formatStockholmTime(new Date(Date.parse(plan.cheapest.startsAt) - 15 * 60_000).toISOString()) : null,
  };
}

/**
 * Today's remaining cheapest window after the user's free time (and after now);
 * if none is useful, tomorrow's (if published). Single-day windows only.
 */
export function choosePlan(today: PriceDay | null, tomorrow: PriceDay | null, activity: Activity, availableAfter: string, nowMs: number | null): DayPlan | null {
  const duration = ACTIVITY_DURATION_MIN[activity] ?? 120;
  const avail = parseHHmm(availableAfter) ?? 0;
  let fallback: DayPlan | null = null;
  if (isUsable(today)) {
    const nowMin = nowMs === null ? 0 : stockholmMinutesOfDay(new Date(nowMs).toISOString());
    const plan = buildDayPlan("today", today, Math.max(avail, nowMin), duration, nowMs);
    if (plan.useful) return plan;
    fallback = plan;
  }
  if (isUsable(tomorrow)) {
    const plan = buildDayPlan("tomorrow", tomorrow, avail, duration, nowMs);
    if (plan.useful) return plan;
  }
  return fallback;
}

export function isUsefulPlan(plan: DayPlan | null): plan is UsefulPlan {
  return !!plan && plan.useful && !!plan.plan && plan.reminderAt !== null;
}

export function windowText(plan: QuestPlan): string {
  return `${formatStockholmTime(plan.cheapest.startsAt)}–${formatStockholmTime(plan.cheapest.endsAt)}`;
}

export type Suggestion =
  | { kind: "price"; id: typeof PRICE_CHALLENGE_ID; plan: UsefulPlan; activity: Activity }
  | { kind: "habit"; id: HabitChallenge["id"]; habit: HabitChallenge }
  | { kind: "learn"; id: typeof LEARN_CHALLENGE.id };

export function buildSuggestions(plan: DayPlan | null, activity: Activity, isDone: (id: string) => boolean): Suggestion[] {
  const list: Suggestion[] = [];
  if (isUsefulPlan(plan) && !isDone(PRICE_CHALLENGE_ID)) list.push({ kind: "price", id: PRICE_CHALLENGE_ID, plan, activity });
  for (const habit of HABITS) if (!isDone(habit.id)) list.push({ kind: "habit", id: habit.id, habit });
  if (!isDone(LEARN_CHALLENGE.id)) list.push({ kind: "learn", id: LEARN_CHALLENGE.id });
  return list;
}

/** Consecutive Stockholm days with at least one completion, ending today (or yesterday). */
export function streakDays(days: string[], today: string | null): number {
  if (!today) return 0;
  const set = new Set(days);
  let cursor = set.has(today) ? today : prevDate(today);
  let count = 0;
  while (set.has(cursor) && count < 366) {
    count += 1;
    cursor = prevDate(cursor);
  }
  return count;
}

export type ReminderRow = { id: string; when: string; title: string; detail: string; tag: "Set" | "Auto" };

export function buildReminders(args: {
  plan: DayPlan | null;
  activity: Activity;
  optIn: boolean;
  availableAfter: string;
  accepted: (id: string) => boolean;
  done: (id: string) => boolean;
}): ReminderRow[] {
  const rows: ReminderRow[] = [];
  const { plan, activity } = args;
  if (isUsefulPlan(plan) && !args.done(PRICE_CHALLENGE_ID) && (args.accepted(PRICE_CHALLENGE_ID) || args.optIn)) {
    rows.push({
      id: "price",
      when: `${plan.day === "tomorrow" ? "Tomorrow" : "Today"} ${plan.reminderAt}`,
      title: `${ACTIVITY_LABEL[activity].name} happy hour · ${windowText(plan.plan)}`,
      detail: `≈ ${plan.plan.cheapest.avgSekPerKwh.toFixed(2)} SEK/kWh spot${isDemoDay(plan.source) ? " · demo prices" : ""}`,
      tag: args.accepted(PRICE_CHALLENGE_ID) ? "Set" : "Auto",
    });
  }
  for (const habit of HABITS) {
    if (args.accepted(habit.id) && !args.done(habit.id)) {
      rows.push({ id: habit.id, when: `Today ${args.availableAfter}`, title: habit.title, detail: "Evening check-in", tag: "Set" });
    }
  }
  return rows.slice(0, 3);
}

export type InboxItem = { id: string; kind: "happy-hour" | "reward"; title: string; body: string };

export function happyHourNotice(plan: UsefulPlan, activity: Activity): InboxItem {
  return {
    id: `hh-${plan.source.data.date}-${plan.plan.cheapest.startsAt}-${activity}`,
    kind: "happy-hour",
    title: `Your ${ACTIVITY_LABEL[activity].noun} has a happy hour ${plan.dayWord}`,
    body: `${windowText(plan.plan)} · about ${plan.plan.cheapest.avgSekPerKwh.toFixed(2)} SEK/kWh spot vs ${plan.plan.baseline.avgSekPerKwh.toFixed(2)} at ${formatStockholmTime(plan.plan.baseline.startsAt)}.${isDemoDay(plan.source) ? " Demo prices." : ""}`,
  };
}
