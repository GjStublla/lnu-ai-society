import type { PriceInterval, PricesResponse, Region } from "@/types/contracts";
import { isValidCalendarDate } from "./time.ts";

/**
 * Validation and normalization of the Elprisetjustnu daily JSON feed.
 *
 * The upstream shape is `[{ time_start, time_end, SEK_per_kWh, ... }]`. Only
 * the three fields WattHabit uses are accepted. Slot length is checked against
 * the real source granularity (60 minutes before October 2025, 15 minutes
 * afterwards) so an hourly historical day is not rejected.
 */

export const PRICE_CURRENCY = "SEK" as const;
export const PRICE_UNIT = "SEK/kWh" as const;

/** Host of the public spot-price source. Only this host is ever requested. */
export const PRICE_SOURCE_HOST = "www.elprisetjustnu.se";

/**
 * Canonical upstream URL: `/api/v1/prices/YYYY/MM-DD_REGION.json`.
 * Kept next to the parser so its format can be unit-tested.
 */
export function priceSourceUrl(region: Region, date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || !isValidCalendarDate(date)) throw new RangeError(`Invalid price date: ${date}`);
  return `https://${PRICE_SOURCE_HOST}/api/v1/prices/${match[1]}/${match[2]}-${match[3]}_${region}.json`;
}

/** A DST day has at most 100 quarter-hour slots; anything larger is suspect. */
export const MAX_UPSTREAM_INTERVALS = 200;

/** Sanity bound for outlier/spike protection, not a market prediction. */
export const MAX_ABS_PRICE_SEK_PER_KWH = 1_000;

/** A 96-slot day is ~15 KB; 512 KB leaves room for a format change. */
export const MAX_UPSTREAM_BYTES = 512 * 1024;

/** Reject a declared oversized upstream body before parsing it as JSON. */
export function isDeclaredPayloadTooLarge(contentLength: string | null): boolean {
  if (contentLength === null || contentLength.trim() === "") return false;
  const declaredBytes = Number(contentLength);
  return Number.isFinite(declaredBytes) && declaredBytes > MAX_UPSTREAM_BYTES;
}

const ACCEPTED_SLOT_MINUTES = new Set([15, 30, 60]);
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_REPORTED_ISSUES = 8;

export type PriceParseIssue = { index: number; reason: string };

export type ParsedUpstreamPrices = {
  intervals: PriceInterval[];
  droppedRecords: number;
  gaps: number;
  overlaps: number;
  issues: PriceParseIssue[];
};

export type PriceDayBounds = { startMs: number; endMs: number };

export type PriceFailureReason =
  | "not_published"
  | "timeout"
  | "network"
  | "http_error"
  | "invalid_payload"
  | "unsupported_date";

type ParsedRecord = { startMs: number; endMs: number; sekPerKwh: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInstant(value: unknown): number | null {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match || !isValidCalendarDate(match[1])) return null;
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return null;
  if (match[5] !== "Z" && (Number(match[7]) > 23 || Number(match[8]) > 59)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

/**
 * Normalize upstream records into sorted, deduplicated intervals.
 *
 * Invalid records are dropped rather than failing the whole day. Gaps and
 * overlaps are counted so the caller can log data-quality problems; the
 * window search only ever joins slots whose instants touch exactly.
 */
export function parseUpstreamPrices(payload: unknown, bounds?: PriceDayBounds): ParsedUpstreamPrices {
  const result: ParsedUpstreamPrices = {
    intervals: [],
    droppedRecords: 0,
    gaps: 0,
    overlaps: 0,
    issues: [],
  };

  const report = (index: number, reason: string) => {
    result.droppedRecords += 1;
    if (result.issues.length < MAX_REPORTED_ISSUES) result.issues.push({ index, reason });
  };

  if (!Array.isArray(payload)) {
    result.issues.push({ index: -1, reason: "payload_not_array" });
    return result;
  }
  if (payload.length > MAX_UPSTREAM_INTERVALS) {
    result.droppedRecords = payload.length;
    result.issues.push({ index: -1, reason: "too_many_records" });
    return result;
  }

  const records: ParsedRecord[] = [];

  for (let index = 0; index < payload.length; index += 1) {
    const raw = payload[index];
    if (!isRecord(raw)) {
      report(index, "not_an_object");
      continue;
    }

    const startMs = readInstant(raw.time_start);
    const endMs = readInstant(raw.time_end);
    if (startMs === null || endMs === null) {
      report(index, "invalid_timestamp");
      continue;
    }
    if (endMs <= startMs) {
      report(index, "empty_interval");
      continue;
    }

    const slotMinutes = (endMs - startMs) / 60_000;
    if (!Number.isInteger(slotMinutes) || !ACCEPTED_SLOT_MINUTES.has(slotMinutes)) {
      report(index, "unexpected_slot_length");
      continue;
    }

    const price = raw.SEK_per_kWh;
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      Math.abs(price) > MAX_ABS_PRICE_SEK_PER_KWH
    ) {
      // Negative prices are legitimate; NaN, strings and absurd values are not.
      report(index, "invalid_price");
      continue;
    }

    if (bounds && (startMs < bounds.startMs || endMs > bounds.endMs)) {
      report(index, "outside_requested_day");
      continue;
    }

    records.push({ startMs, endMs, sekPerKwh: price });
  }

  records.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const accepted: ParsedRecord[] = [];
  for (const record of records) {
    const previous = accepted[accepted.length - 1];
    if (!previous) {
      accepted.push(record);
      continue;
    }
    const isDuplicate =
      record.startMs === previous.startMs &&
      record.endMs === previous.endMs &&
      record.sekPerKwh === previous.sekPerKwh;
    if (isDuplicate) {
      result.droppedRecords += 1;
      continue;
    }
    if (record.startMs < previous.endMs) {
      result.overlaps += 1;
      result.droppedRecords += 1;
      continue;
    }
    if (record.startMs > previous.endMs) result.gaps += 1;
    accepted.push(record);
  }

  result.intervals = accepted.map(({ startMs, endMs, sekPerKwh }) => ({
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(endMs).toISOString(),
    sekPerKwh,
  }));

  return result;
}

/**
 * Distinguish an empty published day from unusable data. The source returns
 * `[]` when a day is not published yet (typically tomorrow before ~13:00
 * Europe/Stockholm); malformed payloads must not be labelled as "not
 * published" because that would hide a real integration failure.
 */
export function classifyEmptyPayload(payload: unknown): PriceFailureReason {
  return Array.isArray(payload) && payload.length === 0 ? "not_published" : "invalid_payload";
}

/**
 * Bounded, user-facing explanation for a failed price request. Provider error
 * bodies and internal exception text are never forwarded.
 */
export function priceFailureMessage(reason: PriceFailureReason, options: { isTomorrow: boolean }): string {
  switch (reason) {
    case "not_published":
      return options.isTomorrow
        ? "Prices for tomorrow have not been published yet. The source normally publishes them after about 13:00 Europe/Stockholm."
        : "No prices have been published for this date.";
    case "timeout":
      return "The price source did not respond in time. Try again in a moment.";
    case "network":
      return "The price source could not be reached. Try again in a moment.";
    case "http_error":
      return "The price source returned an unexpected response. Try again in a moment.";
    case "invalid_payload":
      return "The price source returned data that could not be validated. Try again later.";
    case "unsupported_date":
      return "Prices are not available for this date.";
  }
}

/** Build the single agreed response shape with consistent units. */
export function pricesResponse(input: {
  region: Region;
  date: string;
  intervals: PriceInterval[];
  sourceUrl: string;
  status: PricesResponse["status"];
  updatedAt: string;
  error?: string;
}): PricesResponse {
  const response: PricesResponse = {
    region: input.region,
    date: input.date,
    currency: PRICE_CURRENCY,
    unit: PRICE_UNIT,
    intervals: input.intervals,
    sourceUrl: input.sourceUrl,
    status: input.status,
    updatedAt: input.updatedAt,
  };
  if (input.error) response.error = input.error;
  return response;
}
