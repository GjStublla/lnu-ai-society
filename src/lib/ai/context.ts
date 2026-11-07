import "server-only";
import type { CoachRequest, PricesResponse } from "../../types/contracts.ts";
import { findCheapestWindows } from "../energy/windows.ts";
import { addCalendarDays, stockholmDateString } from "../energy/time.ts";

export type VerifiedPriceContext = {
  startsAt: string;
  endsAt: string;
  averageSekPerKwh: number;
  baselineSekPerKwh: number;
  durationMinutes: number;
  date: string;
  sourceUrl: string;
  status: "live" | "cached";
  updatedAt: string;
};

/** Accept only the exact public source/day/region and known real-data statuses. */
export function contextFromPrices(input: CoachRequest, prices: PricesResponse, now: Date): VerifiedPriceContext | null {
  const today = stockholmDateString(now);
  if (prices.date !== today && prices.date !== addCalendarDays(today, 1)) return null;
  const expectedUrl = `https://www.elprisetjustnu.se/api/v1/prices/${prices.date.slice(0, 4)}/${prices.date.slice(5)}_${input.region}.json`;
  if (prices.region !== input.region || prices.sourceUrl !== expectedUrl || (prices.status !== "live" && prices.status !== "cached")) return null;
  const fetchedAt = Date.parse(prices.updatedAt);
  if (!Number.isFinite(fetchedAt) || fetchedAt > now.getTime() + 60_000 || now.getTime() - fetchedAt > 86_400_000) return null;
  if (prices.currency !== "SEK" || prices.unit !== "SEK/kWh") return null;
  const durationMinutes = input.activities[0] === "charging" ? 60 : 120;
  const windows = findCheapestWindows(prices.intervals, {
    durationMinutes, availableAfter: input.availableAfter, now, maxResults: 100,
    source: { sourceUrl: prices.sourceUrl, status: prices.status },
  });
  if (windows.length === 0) return null;
  const best = windows[0];
  const baseline = windows.reduce((earliest, item) => Date.parse(item.startsAt) < Date.parse(earliest.startsAt) ? item : earliest);
  return {
    startsAt: best.startsAt, endsAt: best.endsAt, averageSekPerKwh: best.averageSekPerKwh,
    baselineSekPerKwh: baseline.averageSekPerKwh, durationMinutes, date: prices.date,
    sourceUrl: prices.sourceUrl, status: prices.status, updatedAt: prices.updatedAt,
  };
}

export function chooseVerifiedContext(contexts: Array<VerifiedPriceContext | null>): VerifiedPriceContext | null {
  const valid = contexts.filter((item): item is VerifiedPriceContext => item !== null).sort((a, b) => a.date.localeCompare(b.date));
  return valid.find((item) => item.baselineSekPerKwh - item.averageSekPerKwh >= 0.05) ?? valid[0] ?? null;
}

const label = (instant: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(new Date(instant));

export function verifiedWindowExplanation(context: VerifiedPriceContext): string {
  const lower = context.averageSekPerKwh < context.baselineSekPerKwh - 0.005;
  return `${label(context.startsAt)}–${label(context.endsAt)} (Europe/Stockholm) is a complete ${context.durationMinutes}-minute window that fits your availability. Its ${context.status} spot average is ${context.averageSekPerKwh.toFixed(2)} SEK/kWh${lower ? `, compared with ${context.baselineSekPerKwh.toFixed(2)} for the earliest eligible start` : "; no lower spot-cost difference is claimed"}. Moving the same task changes when electricity is used, not its kWh.`;
}
