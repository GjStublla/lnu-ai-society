import type { Region } from "@/types/contracts";
import { addCalendarDays, isValidCalendarDate, stockholmDateString } from "./time";

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
 * Dates later than tomorrow are rejected instead of probing the upstream API
 * for unpublished days, and impossible calendar dates (2026-02-30) are
 * rejected before any network call.
 */
export function resolvePriceDate(rawDate: string | null, now: Date): PriceDateResult {
  const today = stockholmDateString(now);
  const tomorrow = addCalendarDays(today, 1);
  if (!tomorrow) return { ok: false, error: "Unable to resolve the current date." };

  if (rawDate === null) return { ok: true, date: today };

  const date = rawDate.trim();
  if (!isValidCalendarDate(date)) {
    return { ok: false, error: "date must be a real calendar date in YYYY-MM-DD format." };
  }
  if (date < EARLIEST_PRICE_DATE) {
    return { ok: false, error: `date must be on or after ${EARLIEST_PRICE_DATE}.` };
  }
  if (date > tomorrow) {
    return { ok: false, error: "date cannot be later than tomorrow in Europe/Stockholm." };
  }
  return { ok: true, date };
}
