// Feature tests for the energy library. No network and no extra dependencies:
// Node 24 runs the TypeScript modules directly via type stripping.
// Run with: node --test "src/lib/energy/__tests__/*.test.mjs"
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addCalendarDays,
  isValidCalendarDate,
  stockholmDateString,
  stockholmDayBounds,
  zonedTimeToInstant,
} from "../time.ts";
import {
  classifyEmptyPayload,
  parseUpstreamPrices,
  priceFailureMessage,
  priceSourceUrl,
} from "../prices.ts";
import { findCheapestWindow, findCheapestWindows } from "../windows.ts";
import {
  VERIFIED_OPPORTUNITIES,
  getCurrentOpportunities,
  validateOpportunityCatalog,
} from "../opportunities.ts";

const SLOT_MS = 15 * 60 * 1000;
const BEFORE_DAY = new Date("2026-01-01T00:00:00Z");

function buildDay(date, priceAt) {
  const bounds = stockholmDayBounds(date);
  assert.ok(bounds, `expected Stockholm day bounds for ${date}`);
  const slots = [];
  let index = 0;
  for (let startMs = bounds.start.getTime(); startMs < bounds.end.getTime(); startMs += SLOT_MS) {
    const endMs = Math.min(startMs + SLOT_MS, bounds.end.getTime());
    slots.push({
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      sekPerKwh: priceAt(index, startMs),
    });
    index += 1;
  }
  return slots;
}

function upstreamShape(intervals) {
  return intervals.map((interval) => ({
    time_start: interval.startsAt,
    time_end: interval.endsAt,
    SEK_per_kWh: interval.sekPerKwh,
  }));
}

test("calendar dates reject impossible days and support leap years", () => {
  assert.equal(isValidCalendarDate("2026-11-07"), true);
  assert.equal(isValidCalendarDate("2028-02-29"), true);
  assert.equal(isValidCalendarDate("2026-02-30"), false);
  assert.equal(isValidCalendarDate("2026-13-01"), false);
  assert.equal(isValidCalendarDate("2026-11-31"), false);
  assert.equal(isValidCalendarDate("07-11-2026"), false);
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCalendarDays("2026-02-28", 1), "2026-03-01");
});

test("Stockholm dates and day lengths follow the zone, not UTC", () => {
  assert.equal(stockholmDateString(new Date("2026-11-07T23:30:00Z")), "2026-11-08");
  assert.equal(stockholmDateString(new Date("2026-11-07T22:59:59Z")), "2026-11-07");

  const normal = stockholmDayBounds("2026-11-07");
  assert.equal(normal.end.getTime() - normal.start.getTime(), 24 * 60 * 60 * 1000);
  assert.equal(normal.start.toISOString(), "2026-11-06T23:00:00.000Z");

  const springForward = stockholmDayBounds("2026-03-29");
  assert.equal(springForward.end.getTime() - springForward.start.getTime(), 23 * 60 * 60 * 1000);

  const fallBack = stockholmDayBounds("2026-10-25");
  assert.equal(fallBack.end.getTime() - fallBack.start.getTime(), 25 * 60 * 60 * 1000);
});

test("DST gaps return null and ambiguous times pick the earlier instant", () => {
  assert.equal(zonedTimeToInstant("2026-03-29", "02:30"), null);
  assert.equal(zonedTimeToInstant("2026-10-25", "02:30").toISOString(), "2026-10-25T00:30:00.000Z");
  assert.equal(zonedTimeToInstant("2026-10-25", "24:00"), null);
  assert.equal(zonedTimeToInstant("2026-02-30", "10:00"), null);
});

test("upstream parser sorts, normalizes and accepts negative prices", () => {
  const bounds = stockholmDayBounds("2026-11-07");
  const parsed = parseUpstreamPrices(
    [
      {
        time_start: "2026-11-07T00:15:00+01:00",
        time_end: "2026-11-07T00:30:00+01:00",
        SEK_per_kWh: 0.5,
      },
      {
        time_start: "2026-11-07T00:00:00+01:00",
        time_end: "2026-11-07T00:15:00+01:00",
        SEK_per_kWh: -0.2,
      },
    ],
    { startMs: bounds.start.getTime(), endMs: bounds.end.getTime() },
  );

  assert.equal(parsed.intervals.length, 2);
  assert.equal(parsed.intervals[0].startsAt, "2026-11-06T23:00:00.000Z");
  assert.equal(parsed.intervals[0].sekPerKwh, -0.2);
  assert.equal(parsed.gaps, 0);
  assert.equal(parsed.overlaps, 0);
  assert.deepEqual(parsed.issues, []);
});

test("upstream parser drops null, string, malformed and absurd records", () => {
  const parsed = parseUpstreamPrices([
    { time_start: "2026-11-07T00:00:00+01:00", time_end: "2026-11-07T00:15:00+01:00", SEK_per_kWh: null },
    { time_start: "2026-11-07T00:15:00+01:00", time_end: "2026-11-07T00:30:00+01:00", SEK_per_kWh: "1.2" },
    { time_start: "not-a-date", time_end: "2026-11-07T00:45:00+01:00", SEK_per_kWh: 1 },
    { time_start: "2026-11-07T00:45:00+01:00", time_end: "2026-11-07T02:15:00+01:00", SEK_per_kWh: 1 },
    { time_start: "2026-11-07T02:15:00+01:00", time_end: "2026-11-07T02:30:00+01:00", SEK_per_kWh: 9999 },
  ]);

  assert.equal(parsed.intervals.length, 0);
  assert.equal(parsed.droppedRecords, 5);
  assert.ok(parsed.issues.length > 0);
});

test("upstream parser flags gaps, removes overlaps and duplicates", () => {
  const parsed = parseUpstreamPrices([
    { time_start: "2026-11-07T00:00:00+01:00", time_end: "2026-11-07T00:15:00+01:00", SEK_per_kWh: 1 },
    { time_start: "2026-11-07T00:15:00+01:00", time_end: "2026-11-07T00:30:00+01:00", SEK_per_kWh: 2 },
    { time_start: "2026-11-07T00:40:00+01:00", time_end: "2026-11-07T00:55:00+01:00", SEK_per_kWh: 3 },
    { time_start: "2026-11-07T00:50:00+01:00", time_end: "2026-11-07T01:05:00+01:00", SEK_per_kWh: 4 },
    { time_start: "2026-11-07T00:15:00+01:00", time_end: "2026-11-07T00:30:00+01:00", SEK_per_kWh: 2 },
    { time_start: "2026-11-07T01:05:00+01:00", time_end: "2026-11-07T01:20:00+01:00", SEK_per_kWh: 5 },
  ]);

  assert.equal(parsed.intervals.length, 4);
  // 00:30 -> 00:40 and 00:55 -> 01:05; the overlapping record is dropped.
  assert.equal(parsed.gaps, 2);
  assert.equal(parsed.overlaps, 1);
  assert.equal(parsed.droppedRecords, 2);
  assert.deepEqual(
    parsed.intervals.map((interval) => interval.sekPerKwh),
    [1, 2, 3, 5],
  );
});

test("upstream parser accepts historical hourly slots and enforces the requested day", () => {
  const bounds = stockholmDayBounds("2025-06-01");
  const hourly = parseUpstreamPrices(
    [
      {
        time_start: "2025-06-01T00:00:00+02:00",
        time_end: "2025-06-01T01:00:00+02:00",
        SEK_per_kWh: 0.3,
      },
    ],
    { startMs: bounds.start.getTime(), endMs: bounds.end.getTime() },
  );
  assert.equal(hourly.intervals.length, 1);

  const outside = parseUpstreamPrices(
    [
      {
        time_start: "2025-07-01T00:00:00+02:00",
        time_end: "2025-07-01T01:00:00+02:00",
        SEK_per_kWh: 1,
      },
    ],
    { startMs: bounds.start.getTime(), endMs: bounds.end.getTime() },
  );
  assert.equal(outside.intervals.length, 0);
  assert.equal(outside.droppedRecords, 1);
});

test("upstream parser rejects non-arrays and oversized payloads", () => {
  const notArray = parseUpstreamPrices({ error: "nope" });
  assert.equal(notArray.intervals.length, 0);
  assert.equal(notArray.issues[0].reason, "payload_not_array");

  const oversized = parseUpstreamPrices(
    Array.from({ length: 201 }, (_, index) => ({
      time_start: new Date(Date.UTC(2026, 0, 1, 0, index * 15)).toISOString(),
      time_end: new Date(Date.UTC(2026, 0, 1, 0, index * 15 + 15)).toISOString(),
      SEK_per_kWh: 1,
    })),
  );
  assert.equal(oversized.intervals.length, 0);
  assert.equal(oversized.issues[0].reason, "too_many_records");
});

test("failure copy is bounded and explains unpublished tomorrow data", () => {
  const tomorrow = priceFailureMessage("not_published", { isTomorrow: true });
  assert.match(tomorrow, /13:00/);
  assert.ok(tomorrow.length < 300);
  const past = priceFailureMessage("not_published", { isTomorrow: false });
  assert.doesNotMatch(past, /13:00/);
  assert.match(priceFailureMessage("timeout", { isTomorrow: false }), /did not respond/);
});

test("empty payload means unpublished, malformed payload means invalid", () => {
  // The source returns [] for a day that is not published yet (tomorrow before
  // ~13:00). Malformed data must not be mislabelled as "not published".
  assert.equal(classifyEmptyPayload([]), "not_published");
  assert.equal(classifyEmptyPayload([{ time_start: "bad" }]), "invalid_payload");
  assert.equal(classifyEmptyPayload({ error: "nope" }), "invalid_payload");
  assert.equal(classifyEmptyPayload(null), "invalid_payload");
});

test("source URL always keeps year, month and day", () => {
  assert.equal(
    priceSourceUrl("SE4", "2026-11-07"),
    "https://www.elprisetjustnu.se/api/v1/prices/2026/11-07_SE4.json",
  );
  assert.equal(
    priceSourceUrl("SE1", "2026-03-29"),
    "https://www.elprisetjustnu.se/api/v1/prices/2026/03-29_SE1.json",
  );
  assert.throws(() => priceSourceUrl("SE4", "2026-11"), RangeError);
});

test("60/90/120-minute windows use contiguous quarter-hour slots", () => {
  const day = buildDay("2026-11-07", (index) => 1 + (index % 4));

  const hour = findCheapestWindow(day, { durationMinutes: 60, now: BEFORE_DAY });
  assert.ok(hour);
  assert.equal(hour.intervalCount, 4);
  assert.equal(hour.startLocal, "00:00");
  assert.equal(hour.endLocal, "01:00");
  assert.equal(Date.parse(hour.endsAt) - Date.parse(hour.startsAt), 60 * 60 * 1000);

  const ninety = findCheapestWindow(day, { durationMinutes: 90, now: BEFORE_DAY });
  assert.equal(ninety.intervalCount, 6);

  const twoHours = findCheapestWindow(day, { durationMinutes: 120, now: BEFORE_DAY });
  assert.equal(twoHours.intervalCount, 8);
});

test("cheapest windows are ordered by average price", () => {
  const day = buildDay("2026-11-07", (index) => 1 + (index % 5));
  const windows = findCheapestWindows(day, { durationMinutes: 60, maxResults: 10, now: BEFORE_DAY });
  assert.equal(windows.length, 10);
  for (let index = 1; index < windows.length; index += 1) {
    assert.ok(windows[index - 1].averageSekPerKwh <= windows[index].averageSekPerKwh);
  }
});

test("negative prices and spikes are handled without special cases", () => {
  const day = buildDay("2026-11-07", (index) => (index >= 40 && index < 44 ? -0.75 : 2.5));
  const best = findCheapestWindow(day, { now: BEFORE_DAY });
  assert.equal(best.startLocal, "10:00");
  assert.equal(best.averageSekPerKwh, -0.75);

  const spike = buildDay("2026-11-07", (index) => (index === 60 ? 50 : 1));
  const window = findCheapestWindow(spike, { now: BEFORE_DAY });
  assert.equal(window.averageSekPerKwh, 1);
  assert.notEqual(window.startLocal, "15:00");
});

test("a gap in the feed is never bridged by a window", () => {
  const full = buildDay("2026-11-07", () => 5);
  const withGap = full.filter((_, index) => index !== 48 && index !== 49);
  const gapStart = Date.parse(full[48].startsAt);
  const gapEnd = Date.parse(full[49].endsAt);

  const windows = findCheapestWindows(withGap, {
    durationMinutes: 60,
    maxResults: 100,
    now: BEFORE_DAY,
  });
  assert.ok(windows.length > 0);
  for (const window of windows) {
    const startMs = Date.parse(window.startsAt);
    const endMs = Date.parse(window.endsAt);
    assert.ok(!(startMs < gapStart && endMs > gapEnd), "window crossed the missing intervals");
  }
});

test("availability constrains the window to the user's free time", () => {
  const day = buildDay("2026-11-07", (index) => Math.floor(index / 4));

  const evening = findCheapestWindow(day, { now: BEFORE_DAY, availableAfter: "18:00" });
  assert.equal(evening.startLocal, "18:00");

  const early = findCheapestWindow(day, { now: BEFORE_DAY, availableUntil: "08:00" });
  assert.equal(early.startLocal, "00:00");

  const tooLate = findCheapestWindows(day, {
    now: BEFORE_DAY,
    availableAfter: "23:00",
    durationMinutes: 120,
  });
  assert.equal(tooLate.length, 0);
});

test("minimum notice excludes past and near-term windows", () => {
  const day = buildDay("2026-11-07", (index) => Math.floor(index / 4));
  const now = new Date("2026-11-07T10:00:00Z"); // 11:00 in Stockholm

  const immediate = findCheapestWindow(day, { now, minNoticeMinutes: 0 });
  assert.equal(immediate.startLocal, "11:00");

  const twoHours = findCheapestWindow(day, { now, minNoticeMinutes: 120 });
  assert.equal(twoHours.startLocal, "13:00");
});

test("assumed load and source provenance are echoed on the window", () => {
  const day = buildDay("2026-11-07", () => 1.5);
  const window = findCheapestWindow(day, {
    now: BEFORE_DAY,
    assumedKwh: 2,
    source: { sourceUrl: "https://example.test/prices", status: "live" },
  });
  assert.equal(window.assumedKwh, 2);
  assert.equal(window.estimatedSek, window.averageSekPerKwh * 2);
  assert.equal(window.sourceUrl, "https://example.test/prices");
  assert.equal(window.status, "live");
});

test("invalid utility options fail fast instead of returning wrong windows", () => {
  const day = buildDay("2026-11-07", () => 1);
  assert.throws(() => findCheapestWindows(day, { durationMinutes: 45 }), RangeError);
  assert.throws(() => findCheapestWindows(day, { availableAfter: "25:00" }), RangeError);
  assert.throws(() => findCheapestWindows(day, { minNoticeMinutes: -1 }), RangeError);
  assert.throws(() => findCheapestWindows(day, { maxResults: 0 }), RangeError);
});

test("spring-forward day has 92 slots and windows keep 60 elapsed minutes", () => {
  const day = buildDay("2026-03-29", () => 1);
  assert.equal(day.length, 92);

  const windows = findCheapestWindows(day, {
    durationMinutes: 60,
    maxResults: 100,
    now: new Date("2026-03-01T00:00:00Z"),
  });
  assert.ok(windows.length > 0);
  for (const window of windows) {
    assert.equal(Date.parse(window.endsAt) - Date.parse(window.startsAt), 60 * 60 * 1000);
    assert.notEqual(window.startLocal, "02:30");
  }

  const oneOClock = windows.find((window) => window.startLocal === "01:00");
  assert.ok(oneOClock);
  assert.equal(oneOClock.endLocal, "03:00");
});

test("fall-back day has 100 slots and the repeated hour stays unambiguous", () => {
  const day = buildDay("2026-10-25", () => 1);
  assert.equal(day.length, 100);

  const windows = findCheapestWindows(day, {
    durationMinutes: 60,
    maxResults: 100,
    now: new Date("2026-10-01T00:00:00Z"),
  });
  assert.ok(windows.length > 0);

  const firstTwoFortyFive = zonedTimeToInstant("2026-10-25", "02:45").toISOString();
  const repeated = windows.find((window) => window.startsAt === firstTwoFortyFive);
  assert.ok(repeated, "expected a window starting at the first 02:45");
  assert.equal(repeated.startLocal, "02:45");
  assert.equal(repeated.endLocal, "02:45");
  assert.equal(Date.parse(repeated.endsAt) - Date.parse(repeated.startsAt), 60 * 60 * 1000);
});

test("parser accepts a complete DST fall-back day", () => {
  const day = buildDay("2026-10-25", () => 0.5);
  const bounds = stockholmDayBounds("2026-10-25");
  const parsed = parseUpstreamPrices(upstreamShape(day), {
    startMs: bounds.start.getTime(),
    endMs: bounds.end.getTime(),
  });
  assert.equal(parsed.intervals.length, 100);
  assert.equal(parsed.gaps, 0);
  assert.equal(parsed.overlaps, 0);
  assert.equal(parsed.intervals[0].startsAt, "2026-10-24T22:00:00.000Z");
});

test("opportunity catalog contains only sourced, verified, dated notices", () => {
  assert.deepEqual(validateOpportunityCatalog(), []);

  for (const opportunity of VERIFIED_OPPORTUNITIES) {
    assert.equal(opportunity.verified, true);
    assert.equal(opportunity.demo, false);
    assert.ok(opportunity.sourceUrl.startsWith("https://"));
    assert.ok(Number.isFinite(Date.parse(opportunity.publishedAt)));
  }

  const list = getCurrentOpportunities(new Date("2026-11-07T12:00:00Z"));
  assert.ok(list.length >= 1);
  for (let index = 1; index < list.length; index += 1) {
    assert.ok(
      Date.parse(list[index - 1].publishedAt) >= Date.parse(list[index].publishedAt),
      "opportunities should be newest first",
    );
  }
});
