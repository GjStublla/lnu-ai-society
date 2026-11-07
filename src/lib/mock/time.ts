// Europe/Stockholm calendar helpers shared by demo fixtures and UI.
// Pure functions: callers pass the instant explicitly (no hidden Date.now()).

export const STOCKHOLM_TZ = "Europe/Stockholm";

/** Offset of Europe/Stockholm from UTC in minutes at a given instant (e.g. 60 or 120). */
export function stockholmOffsetMinutes(ms: number): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: STOCKHOLM_TZ, timeZoneName: "longOffset" })
    .formatToParts(new Date(ms))
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT+01:00";
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(label);
  if (!match) return 60;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** Stockholm calendar date (YYYY-MM-DD) for an instant. */
export function stockholmDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STOCKHOLM_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

/** UTC epoch ms of local midnight in Stockholm for a YYYY-MM-DD date (DST-safe). */
export function stockholmMidnightUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, 0, 0);
  let candidate = wall - stockholmOffsetMinutes(wall) * 60_000;
  candidate = wall - stockholmOffsetMinutes(candidate) * 60_000;
  return candidate;
}

/** Next calendar date string (YYYY-MM-DD). */
export function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** ISO8601 string with the Stockholm offset, e.g. 2026-11-07T00:15:00+01:00. */
export function toStockholmIso(ms: number): string {
  const offset = stockholmOffsetMinutes(ms);
  const local = new Date(ms + offset * 60_000).toISOString().slice(0, 19);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Previous calendar date string (YYYY-MM-DD). */
export function prevDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** e.g. "Saturday 7 November" in Stockholm for an instant. */
export function formatStockholmDay(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: STOCKHOLM_TZ, weekday: "long", day: "numeric", month: "long" }).format(ms);
}

/** Hour of day (0–23) in Stockholm for an instant. */
export function stockholmHour(ms: number): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: STOCKHOLM_TZ, hour: "2-digit", hourCycle: "h23" }).formatToParts(ms).find((p) => p.type === "hour")?.value;
  return Number(hour ?? 0) % 24;
}

/** "HH:mm" in Stockholm for an ISO timestamp. */
export function formatStockholmTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: STOCKHOLM_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Minutes since local Stockholm midnight for an ISO timestamp. */
export function stockholmMinutesOfDay(iso: string): number {
  const [h, m] = formatStockholmTime(iso).split(":").map(Number);
  return (h % 24) * 60 + m;
}

export function parseHHmm(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}
