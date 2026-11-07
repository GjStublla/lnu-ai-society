import type { PriceInterval } from "@/types/contracts";
import { stockholmMinutesOfDay } from "@/lib/mock/time";

export type PriceWindow = {
  startIndex: number;
  endIndex: number; // exclusive
  startsAt: string;
  endsAt: string;
  avgSekPerKwh: number;
};

export type QuestPlan = {
  cheapest: PriceWindow;
  baseline: PriceWindow;
  /** Estimated spot-cost difference in SEK for ~1 kWh (positive = cheaper window costs less). */
  estimatedDiffSek: number;
  durationMinutes: number;
};

export const ACTIVITY_DURATION_MIN: Record<string, number> = { laundry: 120, dishwasher: 120, charging: 60 };
export const ASSUMED_KWH = 1;

function sorted(intervals: PriceInterval[]): PriceInterval[] {
  return intervals
    .filter((i) => Number.isFinite(i.sekPerKwh) && !Number.isNaN(Date.parse(i.startsAt)) && !Number.isNaN(Date.parse(i.endsAt)))
    .slice()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Time-weighted contiguous window starting at index i, or null if it doesn't fit. */
function windowAt(list: PriceInterval[], i: number, durationMs: number): PriceWindow | null {
  let elapsed = 0;
  let weighted = 0;
  let j = i;
  while (j < list.length && elapsed < durationMs) {
    if (j > i && Date.parse(list[j].startsAt) !== Date.parse(list[j - 1].endsAt)) return null;
    const len = Date.parse(list[j].endsAt) - Date.parse(list[j].startsAt);
    if (len <= 0) return null;
    elapsed += len;
    weighted += list[j].sekPerKwh * len;
    j += 1;
  }
  if (elapsed < durationMs) return null;
  return { startIndex: i, endIndex: j, startsAt: list[i].startsAt, endsAt: list[j - 1].endsAt, avgSekPerKwh: weighted / elapsed };
}

/** Cheapest contiguous window that starts at/after the user's available time (Stockholm). */
export function planQuest(intervals: PriceInterval[], availableAfterMin: number | null, durationMinutes: number): { list: PriceInterval[]; plan: QuestPlan | null } {
  const list = sorted(intervals);
  const durationMs = durationMinutes * 60_000;
  let baseline: PriceWindow | null = null;
  let cheapest: PriceWindow | null = null;
  for (let i = 0; i < list.length; i += 1) {
    if (availableAfterMin !== null && stockholmMinutesOfDay(list[i].startsAt) < availableAfterMin) continue;
    const w = windowAt(list, i, durationMs);
    if (!w) continue;
    if (!baseline) baseline = w;
    if (!cheapest || w.avgSekPerKwh < cheapest.avgSekPerKwh) cheapest = w;
  }
  if (!baseline || !cheapest) return { list, plan: null };
  return {
    list,
    plan: { cheapest, baseline, durationMinutes, estimatedDiffSek: (baseline.avgSekPerKwh - cheapest.avgSekPerKwh) * ASSUMED_KWH },
  };
}
