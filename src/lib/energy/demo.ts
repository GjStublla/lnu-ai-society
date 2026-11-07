import type { PricesResponse, Region } from "@/types/contracts";
import { stockholmDayBounds, stockholmParts } from "./time";

/**
 * Deterministic offline price fixture.
 *
 * This is synthetic data for demos and tests only. It is always returned with
 * `status:'demo'` and must never be substituted silently for live prices.
 * The 15-minute slots follow the real Stockholm day boundaries, so DST days
 * produce 92 or 100 intervals exactly like the live source.
 */

// Rough quarter-hour-friendly shape for a winter day in SE4, SEK/kWh.
const HOURLY_DEMO_SEK_PER_KWH = [
  0.42, 0.4, 0.38, 0.36, 0.37, 0.45, 0.72, 1.05, 1.28, 1.12, 0.95, 0.88, 0.84, 0.87, 0.95, 1.12, 1.45,
  1.78, 2.05, 1.92, 1.55, 1.18, 0.86, 0.61,
] as const;

const SLOT_MS = 15 * 60 * 1_000;

function demoPriceAt(hour: number, minute: number): number {
  const base = HOURLY_DEMO_SEK_PER_KWH[hour] ?? HOURLY_DEMO_SEK_PER_KWH[0];
  const next = HOURLY_DEMO_SEK_PER_KWH[(hour + 1) % 24] ?? base;
  const interpolated = base + (next - base) * (minute / 60);
  return Math.round(interpolated * 10_000) / 10_000;
}

export function createDemoPrices(
  region: Region,
  date: string,
  now: Date = new Date(),
): PricesResponse {
  const bounds = stockholmDayBounds(date);
  if (!bounds) throw new RangeError(`Invalid Stockholm calendar date: ${date}`);

  const intervals = [];
  for (let startMs = bounds.start.getTime(); startMs < bounds.end.getTime(); startMs += SLOT_MS) {
    const endMs = Math.min(startMs + SLOT_MS, bounds.end.getTime());
    const local = stockholmParts(new Date(startMs));
    intervals.push({
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      sekPerKwh: demoPriceAt(local.hour, local.minute),
    });
  }

  return {
    region,
    date,
    currency: "SEK",
    unit: "SEK/kWh",
    intervals,
    // The URL documents the live format this fixture imitates, not its origin.
    sourceUrl: "https://www.elprisetjustnu.se/elpris-api",
    status: "demo",
    updatedAt: now.toISOString(),
  };
}
