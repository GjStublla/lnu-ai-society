"use client";
// Minute-resolution clock as an external store, so components never call
// Date.now() during render. Returns null during SSR/hydration.
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}

function getMinute(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

function getServerMinute(): number | null {
  return null;
}

export function useNowMinute(): number | null {
  return useSyncExternalStore<number | null>(subscribe, getMinute, getServerMinute);
}
