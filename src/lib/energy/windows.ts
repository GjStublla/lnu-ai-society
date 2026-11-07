import type { DataStatus, PriceInterval } from "@/types/contracts";

/**
 * Cheapest contiguous price windows for a user's availability.
 *
 * Adjacency is decided on absolute instants (`next.start === current.end`),
 * never on local clock strings, so DST days and gaps in the feed cannot create
 * a fake window. The utility is pure (no network, no Node APIs) and can be
 * imported by a client component after the prices are fetched.
 *
 * The estimate is the time-weighted spot-price average of the window. With
 * `assumedKwh` it becomes the modelled spot cost for the same expected load at
 * another time — not a measured saving and not a kWh reduction.
 */

export const WINDOW_DURATIONS = [60, 90, 120] as const;
export type WindowDurationMinutes = (typeof WINDOW_DURATIONS)[number];

export type WindowSource = { sourceUrl: string; status: DataStatus };

export type WindowSearchOptions = {
  /** Requested contiguous length. One of 60, 90 or 120 minutes. */
  durationMinutes?: WindowDurationMinutes;
  /** Earliest local start time, `HH:mm` in Europe/Stockholm. */
  availableAfter?: string | null;
  /** Latest local end time, `HH:mm` in Europe/Stockholm. */
  availableUntil?: string | null;
  /** Minutes of notice before a window may start (default 0). */
  minNoticeMinutes?: number;
  /** Clock used for the notice check. Defaults to now; injectable for tests. */
  now?: Date;
  /** Number of alternatives to return, cheapest first (default 3). */
  maxResults?: number;
  /** Assumed load in kWh for a clearly labelled modelled cost. */
  assumedKwh?: number | null;
  /** Provenance of the intervals, echoed onto every window. */
  source?: WindowSource | null;
};

export type PriceWindow = {
  startsAt: string;
  endsAt: string;
  /** Wall-clock start in Europe/Stockholm, `HH:mm`. */
  startLocal: string;
  /** Wall-clock end in Europe/Stockholm, `HH:mm`. Equal to startLocal when a
   * window crosses the autumn DST overlap; use the ISO instants in that case. */
  endLocal: string;
  durationMinutes: number;
  intervalCount: number;
  averageSekPerKwh: number;
  assumedKwh: number | null;
  /** averageSekPerKwh * assumedKwh, or null when no load was supplied. */
  estimatedSek: number | null;
  currency: "SEK";
  unit: "SEK/kWh";
  sourceUrl: string | null;
  status: DataStatus | null;
};

type Slot = { startMs: number; endMs: number; sekPerKwh: number };
type LocalFields = { dateKey: string; minutes: number };

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const stockholmFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Stockholm",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function localFields(instantMs: number): LocalFields {
  const values = new Map<string, string>();
  for (const part of stockholmFormatter.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") values.set(part.type, part.value);
  }
  return {
    dateKey: `${values.get("year") ?? "0000"}-${values.get("month") ?? "00"}-${values.get("day") ?? "00"}`,
    minutes: Number(values.get("hour") ?? "0") * 60 + Number(values.get("minute") ?? "0"),
  };
}

function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseClock(value: string, option: string): number {
  const match = CLOCK_PATTERN.exec(value.trim());
  if (!match) throw new RangeError(`${option} must be a valid HH:mm time in Europe/Stockholm.`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function toSlots(intervals: PriceInterval[]): Slot[] {
  const slots: Slot[] = [];
  for (const interval of intervals) {
    const startMs = Date.parse(interval.startsAt);
    const endMs = Date.parse(interval.endsAt);
    const sekPerKwh = interval.sekPerKwh;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
    if (typeof sekPerKwh !== "number" || !Number.isFinite(sekPerKwh)) continue;
    slots.push({ startMs, endMs, sekPerKwh });
  }
  slots.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  return slots;
}

/** Split sorted slots into runs whose instants touch exactly. */
function contiguousRuns(slots: Slot[]): Slot[][] {
  const runs: Slot[][] = [];
  for (const slot of slots) {
    const current = runs[runs.length - 1];
    const previous = current?.[current.length - 1];
    if (current && previous && previous.endMs === slot.startMs) current.push(slot);
    else runs.push([slot]);
  }
  return runs;
}

/**
 * Return up to `maxResults` cheapest contiguous windows, cheapest first.
 * Ties are broken by the earlier start so results are deterministic.
 */
export function findCheapestWindows(
  intervals: PriceInterval[],
  options: WindowSearchOptions = {},
): PriceWindow[] {
  const durationMinutes = options.durationMinutes ?? 60;
  if (!WINDOW_DURATIONS.includes(durationMinutes)) {
    throw new RangeError("durationMinutes must be 60, 90 or 120.");
  }

  const targetMs = durationMinutes * 60_000;
  const nowMs = (options.now ?? new Date()).getTime();
  if (!Number.isFinite(nowMs)) throw new RangeError("now must be a valid Date.");

  const minNoticeMinutes = options.minNoticeMinutes ?? 0;
  if (!Number.isFinite(minNoticeMinutes) || minNoticeMinutes < 0) {
    throw new RangeError("minNoticeMinutes must be zero or a positive number.");
  }

  const maxResults = options.maxResults ?? 3;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
    throw new RangeError("maxResults must be an integer between 1 and 100.");
  }

  const assumedKwh = options.assumedKwh ?? null;
  if (assumedKwh !== null && (!Number.isFinite(assumedKwh) || assumedKwh <= 0)) {
    throw new RangeError("assumedKwh must be a positive number when provided.");
  }

  const afterMinutes =
    options.availableAfter != null ? parseClock(options.availableAfter, "availableAfter") : null;
  const untilMinutes =
    options.availableUntil != null ? parseClock(options.availableUntil, "availableUntil") : null;

  const earliestStartMs = nowMs + minNoticeMinutes * 60_000;
  const source = options.source ?? null;

  const candidates: Array<{
    startMs: number;
    endMs: number;
    intervalCount: number;
    average: number;
  }> = [];

  for (const run of contiguousRuns(toSlots(intervals))) {
    for (let startIndex = 0; startIndex < run.length; startIndex += 1) {
      const first = run[startIndex];
      if (first.endMs - first.startMs > targetMs) continue;

      let endMs = first.endMs;
      let weightedSum = first.sekPerKwh * (first.endMs - first.startMs);
      let intervalCount = 1;
      let cursor = startIndex;

      while (endMs - first.startMs < targetMs && cursor + 1 < run.length) {
        cursor += 1;
        const slot = run[cursor];
        if (slot.startMs !== endMs) break;
        weightedSum += slot.sekPerKwh * (slot.endMs - slot.startMs);
        endMs = slot.endMs;
        intervalCount += 1;
      }

      if (endMs - first.startMs !== targetMs) continue;
      if (first.startMs < earliestStartMs) continue;

      const startLocal = localFields(first.startMs);
      const endLocal = localFields(endMs);

      if (afterMinutes !== null && startLocal.minutes < afterMinutes) continue;
      if (untilMinutes !== null) {
        const endMinutes = endLocal.dateKey === startLocal.dateKey ? endLocal.minutes : 24 * 60;
        if (endMinutes > untilMinutes) continue;
      }

      candidates.push({
        startMs: first.startMs,
        endMs,
        intervalCount,
        average: weightedSum / targetMs,
      });
    }
  }

  candidates.sort((a, b) => a.average - b.average || a.startMs - b.startMs);

  return candidates.slice(0, maxResults).map((candidate) => {
    const startLocal = localFields(candidate.startMs);
    const endLocal = localFields(candidate.endMs);
    return {
      startsAt: new Date(candidate.startMs).toISOString(),
      endsAt: new Date(candidate.endMs).toISOString(),
      startLocal: clockLabel(startLocal.minutes),
      endLocal: clockLabel(endLocal.minutes),
      durationMinutes,
      intervalCount: candidate.intervalCount,
      averageSekPerKwh: candidate.average,
      assumedKwh,
      estimatedSek: assumedKwh === null ? null : candidate.average * assumedKwh,
      currency: "SEK",
      unit: "SEK/kWh",
      sourceUrl: source?.sourceUrl ?? null,
      status: source?.status ?? null,
    };
  });
}

/** Convenience wrapper for the single best window. */
export function findCheapestWindow(
  intervals: PriceInterval[],
  options: WindowSearchOptions = {},
): PriceWindow | null {
  return findCheapestWindows(intervals, { ...options, maxResults: 1 })[0] ?? null;
}
