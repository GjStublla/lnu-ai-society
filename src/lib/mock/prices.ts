import type { PriceInterval, PricesResponse, Region } from "@/types/contracts";
import { nextDate, stockholmMidnightUtc, toStockholmIso } from "./time";

export const PRICE_SOURCE_URL = "https://www.elprisetjustnu.se/elpris-api";

/**
 * DEMO price shape in SEK/kWh for a local hour (fractional). Illustrative only:
 * cheap night, morning peak 07:00–09:30, evening peak 17:00–20:30.
 */
function demoShape(hour: number): number {
  if (hour < 5) return 0.22 + 0.03 * Math.sin(hour);
  if (hour < 7) return 0.3 + (hour - 5) * 0.35;
  if (hour < 9.5) return 1.45 + 0.15 * Math.sin((hour - 7) * 1.2);
  if (hour < 12) return 1.0 - (hour - 9.5) * 0.18;
  if (hour < 15) return 0.55 + 0.05 * Math.cos(hour);
  if (hour < 17) return 0.7 + (hour - 15) * 0.3;
  if (hour < 20.5) return 1.75 + 0.2 * Math.sin((hour - 17) * 0.9);
  if (hour < 22) return 0.95 - (hour - 20.5) * 0.25;
  return 0.48 - (hour - 22) * 0.06;
}

/** Clearly labelled demo curve for a Stockholm date. DST days yield 92 or 100 slots. */
export function buildDemoPrices(region: Region, date: string, updatedAt: string): PricesResponse {
  const start = stockholmMidnightUtc(date);
  const end = stockholmMidnightUtc(nextDate(date));
  const intervals: PriceInterval[] = [];
  for (let t = start, i = 0; t < end; t += 15 * 60_000, i += 1) {
    const hour = (i * 15) / 60;
    const regional = region === "SE4" ? 1 : region === "SE3" ? 0.9 : 0.55;
    intervals.push({
      startsAt: toStockholmIso(t),
      endsAt: toStockholmIso(t + 15 * 60_000),
      sekPerKwh: Math.round(demoShape(hour) * regional * 1000) / 1000,
    });
  }
  return {
    region,
    date,
    currency: "SEK",
    unit: "SEK/kWh",
    intervals,
    sourceUrl: PRICE_SOURCE_URL,
    status: "demo",
    updatedAt,
    error: "Price feed not connected — DEMO price curve, not real market data.",
  };
}
