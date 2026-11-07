import type { Region } from "@/types/contracts";
import { isValidCalendarDate, stockholmDateString } from "./time";

/** Swedish spot-price bidding zones accepted by the public price source. */
export const REGIONS = ["SE1", "SE2", "SE3", "SE4"] as const;

/** SE4 is the default zone in the product brief (Växjö). */
export const DEFAULT_REGION: Region = "SE4";

/** The public source keeps quarter/hour history from this date onwards. */
export const EARLIEST_PRICE_DATE = "2022-11-01";

export const REGION_ERROR_MESSAGE = "region must be one of SE1, SE2, SE3, SE4.";

/** Accept a case-insensitive zone name, returning the canonical enum value. */
export function parseRegion(value: string): Region | null {
  const normalized = value.trim().toUpperCase();
  return (REGIONS as readonly string[]).includes(normalized) ? (normalized as Region) : null;
}

export type PriceDateResult = { ok: true; date: string } | { ok: false; error: string };

/**
 * Resolve the optional `date` query parameter.
 *
 * The default is today's Stockholm date, not the caller machine's UTC date.
 * Impossible calendar dates (2026-02-30) and dates before the source's history
 * floor are rejected before any network call. Real future dates are accepted:
 * the source simply has no data yet, so the service returns an HTTP 200
 * `status:"unavailable"` response instead of pretending the request was
 * malformed.
 */
export function resolvePriceDate(rawDate: string | null, now: Date): PriceDateResult {
  const today = stockholmDateString(now);
  if (rawDate === null) return { ok: true, date: today };

  const date = rawDate.trim();
  if (!isValidCalendarDate(date)) {
    return { ok: false, error: "date must be a real calendar date in YYYY-MM-DD format." };
  }
  if (date < EARLIEST_PRICE_DATE) {
    return { ok: false, error: `date must be on or after ${EARLIEST_PRICE_DATE}.` };
  }
  return { ok: true, date };
}
