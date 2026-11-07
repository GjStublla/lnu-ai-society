import type { PriceInterval, PricesResponse, Region } from "@/types/contracts";
import {
  classifyEmptyPayload,
  isDeclaredPayloadTooLarge,
  MAX_UPSTREAM_BYTES,
  parseUpstreamPrices,
  priceFailureMessage,
  priceSourceUrl,
  pricesResponse,
  type PriceFailureReason,
} from "./prices.ts";
import { addCalendarDays, stockholmDateString, stockholmDateTimeLabel, stockholmDayBounds } from "./time.ts";

/**
 * Server-side price loader: bounded upstream request, validation, a small
 * per-process cache and a transparent unavailable response.
 *
 * The cache is an optimisation only. It is not durable: serverless instances
 * may each keep their own copy, and cached responses keep the original fetch
 * time so `updatedAt` never claims fresher data than exists.
 */

export const UPSTREAM_TIMEOUT_MS = 6_000;
export const CACHE_TTL_MS = 5 * 60 * 1_000;
export const STALE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1_000;
export const FAILURE_CACHE_TTL_MS = 30 * 1_000;

const MAX_CACHE_ENTRIES = 48;

type CacheEntry = {
  region: Region;
  date: string;
  intervals: PriceInterval[];
  fetchedAtMs: number;
  sourceUrl: string;
};

type FetchOutcome =
  | { ok: true; entry: CacheEntry }
  | { ok: false; reason: PriceFailureReason; attemptedAtMs: number };

const priceCache = new Map<string, CacheEntry>();
const failureCache = new Map<string, { reason: PriceFailureReason; attemptedAtMs: number }>();
const inFlight = new Map<string, Promise<FetchOutcome>>();

function cacheKey(region: Region, date: string): string {
  return `${region}:${date}`;
}

function evictOldestEntry(): void {
  if (priceCache.size <= MAX_CACHE_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestFetchedAt = Number.POSITIVE_INFINITY;
  for (const [key, entry] of priceCache) {
    if (entry.fetchedAtMs < oldestFetchedAt) {
      oldestFetchedAt = entry.fetchedAtMs;
      oldestKey = key;
    }
  }
  if (oldestKey !== null) priceCache.delete(oldestKey);
}

function evictOldestFailure(): void {
  if (failureCache.size <= MAX_CACHE_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestAttempt = Number.POSITIVE_INFINITY;
  for (const [key, failure] of failureCache) {
    if (failure.attemptedAtMs < oldestAttempt) {
      oldestAttempt = failure.attemptedAtMs;
      oldestKey = key;
    }
  }
  if (oldestKey !== null) failureCache.delete(oldestKey);
}

function cachedResponse(entry: CacheEntry): PricesResponse {
  return pricesResponse({
    region: entry.region,
    date: entry.date,
    intervals: entry.intervals,
    sourceUrl: entry.sourceUrl,
    status: "cached",
    updatedAt: new Date(entry.fetchedAtMs).toISOString(),
  });
}

function failureResponse(input: {
  region: Region;
  date: string;
  sourceUrl: string;
  reason: PriceFailureReason;
  attemptedAtMs: number;
  cached: CacheEntry | undefined;
}): PricesResponse {
  const isTomorrow = input.date === addCalendarDays(stockholmDateString(new Date(input.attemptedAtMs)), 1);

  if (input.cached && input.attemptedAtMs - input.cached.fetchedAtMs <= STALE_CACHE_MAX_AGE_MS) {
    return pricesResponse({
      region: input.region,
      date: input.date,
      intervals: input.cached.intervals,
      sourceUrl: input.cached.sourceUrl,
      status: "cached",
      updatedAt: new Date(input.cached.fetchedAtMs).toISOString(),
      error: `Live prices are unavailable right now. Showing prices fetched at ${stockholmDateTimeLabel(
        new Date(input.cached.fetchedAtMs),
      )}.`,
    });
  }

  return pricesResponse({
    region: input.region,
    date: input.date,
    intervals: [],
    sourceUrl: input.sourceUrl,
    status: "unavailable",
    updatedAt: new Date(input.attemptedAtMs).toISOString(),
    error: priceFailureMessage(input.reason, { isTomorrow }),
  });
}

async function fetchPrices(input: {
  region: Region;
  date: string;
  sourceUrl: string;
  attemptedAtMs: number;
}): Promise<FetchOutcome> {
  const key = cacheKey(input.region, input.date);
  const fail = (reason: PriceFailureReason): FetchOutcome => {
    failureCache.set(key, { reason, attemptedAtMs: input.attemptedAtMs });
    evictOldestFailure();
    return { ok: false, reason, attemptedAtMs: input.attemptedAtMs };
  };

  let response: Response;
  try {
    response = await fetch(input.sourceUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return fail(timedOut ? "timeout" : "network");
  }

  if (!response.ok) return fail(response.status === 404 ? "not_published" : "http_error");

  if (isDeclaredPayloadTooLarge(response.headers.get("content-length"))) {
    return fail("invalid_payload");
  }

  let payload: unknown;
  try {
    if (!response.body) return fail("invalid_payload");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_UPSTREAM_BYTES) {
        await reader.cancel();
        return fail("invalid_payload");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    // The deadline can fire after headers arrive but while the body is read.
    const timedOut =
      error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return fail(timedOut ? "timeout" : "invalid_payload");
  }

  const bounds = stockholmDayBounds(input.date);
  if (!bounds) return fail("unsupported_date");

  const parsed = parseUpstreamPrices(payload, {
    startMs: bounds.start.getTime(),
    endMs: bounds.end.getTime(),
  });

  if (parsed.intervals.length === 0) {
    return fail(classifyEmptyPayload(payload));
  }

  if (parsed.droppedRecords > 0 || parsed.gaps > 0 || parsed.overlaps > 0) {
    console.warn("[energy:prices] upstream data quality", {
      region: input.region,
      date: input.date,
      droppedRecords: parsed.droppedRecords,
      gaps: parsed.gaps,
      overlaps: parsed.overlaps,
    });
  }

  const entry: CacheEntry = {
    region: input.region,
    date: input.date,
    intervals: parsed.intervals,
    fetchedAtMs: input.attemptedAtMs,
    sourceUrl: input.sourceUrl,
  };
  priceCache.set(key, entry);
  failureCache.delete(key);
  evictOldestEntry();
  return { ok: true, entry };
}

/**
 * Load prices for a region and Stockholm calendar date.
 *
 * The returned `PricesResponse` is always safe to render: failures become
 * `status:'unavailable'` (or `'cached'` with an explanatory `error`) instead of
 * throwing into the page.
 */
export async function loadPrices(region: Region, date: string, now: Date = new Date()): Promise<PricesResponse> {
  const nowMs = now.getTime();
  const sourceUrl = priceSourceUrl(region, date);
  const key = cacheKey(region, date);
  const cached = priceCache.get(key);

  if (cached && nowMs - cached.fetchedAtMs < CACHE_TTL_MS) return cachedResponse(cached);

  const recentFailure = failureCache.get(key);
  if (recentFailure && nowMs - recentFailure.attemptedAtMs < FAILURE_CACHE_TTL_MS) {
    return failureResponse({
      region,
      date,
      sourceUrl,
      reason: recentFailure.reason,
      attemptedAtMs: recentFailure.attemptedAtMs,
      cached,
    });
  }

  const pending = inFlight.get(key);
  if (pending) {
    const outcome = await pending;
    return outcome.ok
      ? cachedResponse(outcome.entry)
      : failureResponse({
          region,
          date,
          sourceUrl,
          reason: outcome.reason,
          attemptedAtMs: outcome.attemptedAtMs,
          cached,
        });
  }

  const task = fetchPrices({ region, date, sourceUrl, attemptedAtMs: nowMs }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, task);

  const outcome = await task;
  return outcome.ok
    ? pricesResponse({
        region,
        date,
        intervals: outcome.entry.intervals,
        sourceUrl,
        status: "live",
        updatedAt: new Date(outcome.entry.fetchedAtMs).toISOString(),
      })
    : failureResponse({
        region,
        date,
        sourceUrl,
        reason: outcome.reason,
        attemptedAtMs: outcome.attemptedAtMs,
        cached,
      });
}
