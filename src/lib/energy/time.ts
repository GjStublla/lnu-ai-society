/**
 * Europe/Stockholm calendar and DST helpers shared by the energy features.
 *
 * Prices are compared as absolute instants. Local wall-clock values are only
 * used for display and for user availability, never to decide whether two
 * price slots are adjacent: a Stockholm day can contain 92, 96 or 100
 * quarter-hour intervals.
 */

export const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

export type StockholmParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type CalendarDate = { year: number; month: number; day: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;

const stockholmPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STOCKHOLM_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateParts(parts: CalendarDate): string {
  return `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** Wall-clock fields of an instant in Europe/Stockholm. */
export function stockholmParts(instant: Date): StockholmParts {
  const values = new Map<string, number>();
  for (const part of stockholmPartsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") values.set(part.type, Number(part.value));
  }
  return {
    year: values.get("year") ?? 0,
    month: values.get("month") ?? 0,
    day: values.get("day") ?? 0,
    hour: values.get("hour") ?? 0,
    minute: values.get("minute") ?? 0,
    second: values.get("second") ?? 0,
  };
}

/**
 * Offset of Stockholm wall time from UTC at an instant, in milliseconds.
 * Positive values mean the local clock is ahead of UTC.
 */
function stockholmOffsetMsAt(instantMs: number): number {
  const parts = stockholmParts(new Date(instantMs));
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Calendar date of an instant in Stockholm, `YYYY-MM-DD`. */
export function stockholmDateString(instant: Date): string {
  const parts = stockholmParts(instant);
  return formatDateParts(parts);
}

/** Wall-clock time of an instant in Stockholm, `HH:mm`. */
export function stockholmTimeString(instant: Date): string {
  const parts = stockholmParts(instant);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Human-readable instants for bounded API error messages. */
export function stockholmDateTimeLabel(instant: Date): string {
  const parts = stockholmParts(instant);
  return `${formatDateParts(parts)} ${pad2(parts.hour)}:${pad2(parts.minute)} ${STOCKHOLM_TIME_ZONE}`;
}

/** Parse a real proleptic Gregorian date, rejecting impossible days. */
export function parseCalendarDate(value: string): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

export function isValidCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

/** Add whole calendar days to a `YYYY-MM-DD` date without time-zone drift. */
export function addCalendarDays(date: string, days: number): string | null {
  const parts = parseCalendarDate(date);
  if (!parts) return null;
  if (!Number.isInteger(days)) return null;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + days * DAY_MS);
  return formatDateParts({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/**
 * Convert a Stockholm wall-clock time on a calendar date to an instant.
 *
 * Springs-forward gaps return `null` (the local time does not exist). During
 * the autumn overlap the earlier occurrence is returned, which matches how
 * people usually read "02:30" on that night and keeps availability windows
 * predictable.
 */
export function zonedTimeToInstant(date: string, time: string): Date | null {
  const parts = parseCalendarDate(date);
  const timeMatch = TIME_PATTERN.exec(time);
  if (!parts || !timeMatch) return null;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute);

  const offsets = new Set<number>();
  for (const probe of [wallAsUtc - DAY_MS, wallAsUtc, wallAsUtc + DAY_MS]) {
    offsets.add(stockholmOffsetMsAt(probe));
  }

  const matches = [...offsets]
    .map((offset) => wallAsUtc - offset)
    .filter((candidate) => {
      const local = stockholmParts(new Date(candidate));
      return (
        local.year === parts.year &&
        local.month === parts.month &&
        local.day === parts.day &&
        local.hour === hour &&
        local.minute === minute
      );
    })
    .sort((a, b) => a - b);

  return matches.length > 0 ? new Date(matches[0]) : null;
}

/**
 * First and last instants of a Stockholm calendar day. The day may be 23, 24
 * or 25 hours long, so callers must not assume 96 intervals.
 */
export function stockholmDayBounds(date: string): { start: Date; end: Date } | null {
  const start = zonedTimeToInstant(date, "00:00");
  const nextDate = addCalendarDays(date, 1);
  if (!start || !nextDate) return null;
  const end = zonedTimeToInstant(nextDate, "00:00");
  if (!end || end.getTime() <= start.getTime()) return null;
  return { start, end };
}
