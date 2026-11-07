"use client";
// Browser-local demo state (localStorage, with in-memory fallback when storage
// is blocked). NOT a server-validated entitlement.
import { useMemo, useSyncExternalStore } from "react";
import type { Housing, Region } from "@/types/contracts";
import { DEMO_EXAMPLE_STAMPS, DEMO_GOAL } from "@/lib/mock/rewards";
import { ACTIVITIES, type Activity } from "@/lib/mock/types";

export type { Activity };

export type Prefs = {
  region: Region;
  housing: Housing;
  activities: Activity[];
  availableAfter: string; // HH:mm
  remindersOptIn: boolean;
};

type DayMark = { challengeId: string; day: string };

export type DemoState = {
  prefs: Prefs | null;
  progress: number;
  goal: number;
  completions: DayMark[];
  accepted: DayMark[];
  voucherRedeemed: boolean;
};

const KEY = "watthabit-demo-v2";
const EVENT = "watthabit-demo-change";
const REGIONS: Region[] = ["SE1", "SE2", "SE3", "SE4"];
const HOUSING: Housing[] = ["included", "separate", "unknown"];

export const DEFAULT_PREFS: Prefs = { region: "SE4", housing: "unknown", activities: ["laundry"], availableAfter: "18:00", remindersOptIn: false };

export const INITIAL_STATE: DemoState = {
  prefs: null,
  progress: DEMO_EXAMPLE_STAMPS,
  goal: DEMO_GOAL,
  completions: [],
  accepted: [],
  voucherRedeemed: false,
};

let memoryRaw: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function parsePrefs(value: unknown): Prefs | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const activities = Array.isArray(v.activities)
    ? [...new Set(v.activities.filter((a): a is Activity => ACTIVITIES.includes(a as Activity)))].slice(0, 3)
    : [];
  return {
    region: REGIONS.includes(v.region as Region) ? (v.region as Region) : "SE4",
    housing: HOUSING.includes(v.housing as Housing) ? (v.housing as Housing) : "unknown",
    activities: activities.length > 0 ? activities : ["laundry"],
    availableAfter: typeof v.availableAfter === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.availableAfter) ? v.availableAfter : "18:00",
    remindersOptIn: v.remindersOptIn === true,
  };
}

function parseMarks(value: unknown): DayMark[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is DayMark => !!m && typeof m === "object" && typeof (m as DayMark).challengeId === "string" && typeof (m as DayMark).day === "string")
    .slice(-200);
}

function parse(raw: string | null | undefined): DemoState {
  if (!raw) return INITIAL_STATE;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      prefs: parsePrefs(value.prefs),
      progress: typeof value.progress === "number" ? Math.max(0, Math.min(DEMO_GOAL, Math.round(value.progress))) : DEMO_EXAMPLE_STAMPS,
      goal: DEMO_GOAL,
      completions: parseMarks(value.completions),
      accepted: parseMarks(value.accepted),
      voucherRedeemed: value.voucherRedeemed === true,
    };
  } catch {
    return INITIAL_STATE;
  }
}

/** `hydrated` is false during SSR and hydration, so first-run UI never flashes for returning users. */
export function useDemoState(): { state: DemoState; hydrated: boolean } {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, read, () => undefined);
  return useMemo(() => ({ state: parse(raw), hydrated: raw !== undefined }), [raw]);
}

function write(next: string | null) {
  memoryRaw = next;
  try {
    if (next === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, next);
  } catch {
    /* Storage blocked: in-memory fallback keeps the demo usable for this tab. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function updateDemoState(updater: (state: DemoState) => DemoState) {
  write(JSON.stringify(updater(parse(read()))));
}

export function resetDemoState() {
  write(null);
}
