import type { PriceInterval } from "@/types/contracts";
import { findCheapestWindows } from "@/lib/energy/windows";

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

/** UI-compatible adapter around the shared, DST-safe energy window engine. */
export function planQuest(intervals: PriceInterval[], availableAfterMin: number | null, durationMinutes: number, now = new Date()): { list: PriceInterval[]; plan: QuestPlan | null } {
  const list = intervals.filter((i) => Number.isFinite(i.sekPerKwh) && Number.isFinite(Date.parse(i.startsAt)) && Number.isFinite(Date.parse(i.endsAt)))
    .slice().sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const availableAfter = availableAfterMin === null ? null : `${String(Math.floor(availableAfterMin / 60)).padStart(2, "0")}:${String(availableAfterMin % 60).padStart(2, "0")}`;
  const windows = findCheapestWindows(list, { durationMinutes: durationMinutes as 60 | 90 | 120, availableAfter, now, maxResults: 100 });
  if (!windows.length) return { list, plan: null };
  const toWindow = (w: (typeof windows)[number]): PriceWindow => {
    const startIndex = list.findIndex((i) => Date.parse(i.startsAt) === Date.parse(w.startsAt));
    const endIndex = list.findIndex((i) => Date.parse(i.endsAt) === Date.parse(w.endsAt)) + 1;
    return { startIndex, endIndex, startsAt: w.startsAt, endsAt: w.endsAt, avgSekPerKwh: w.averageSekPerKwh };
  };
  const cheapest = toWindow(windows[0]);
  const baseline = toWindow(windows.reduce((first, candidate) => Date.parse(candidate.startsAt) < Date.parse(first.startsAt) ? candidate : first));
  return { list, plan: { cheapest, baseline, durationMinutes, estimatedDiffSek: baseline.avgSekPerKwh - cheapest.avgSekPerKwh } };
}
