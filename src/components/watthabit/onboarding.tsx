"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BatteryCharging, Bell, Check, ChevronLeft, Shirt, UtensilsCrossed, Zap } from "lucide-react";
import type { Housing, Region } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Activity, Prefs } from "./demo-store";
import { useFocusTrap, useScrollLock } from "./sheet";

const REGIONS: { value: Region; label: string; hint: string }[] = [
  { value: "SE1", label: "SE1", hint: "Northern Sweden · Luleå" },
  { value: "SE2", label: "SE2", hint: "Central north · Sundsvall" },
  { value: "SE3", label: "SE3", hint: "Central & south · Stockholm, Göteborg" },
  { value: "SE4", label: "SE4", hint: "Southern Sweden · Malmö, Växjö" },
];

const HOUSING: { value: Housing; label: string; hint: string }[] = [
  { value: "included", label: "Included in my rent", hint: "Timing won't change your bill — challenges are still good habits." },
  { value: "separate", label: "I pay it separately", hint: "Timing can lower cost if your contract follows spot prices." },
  { value: "unknown", label: "Not sure", hint: "We'll show estimates and flag when timing really matters." },
];

const ACTIVITIES: { value: Activity; label: string; hint: string; icon: typeof Shirt }[] = [
  { value: "laundry", label: "Laundry", hint: "2-hour window", icon: Shirt },
  { value: "dishwasher", label: "Dishwasher", hint: "2-hour window", icon: UtensilsCrossed },
  { value: "charging", label: "Charging", hint: "1-hour window", icon: BatteryCharging },
];

const option =
  "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]";
const optionOn = "border-primary bg-accent/60 ring-1 ring-primary";
const optionOff = "border-border hover:border-input";

const STEPS = 3;

export function Onboarding({ initial, editing, onFinish, onSkip }: { initial: Prefs; editing: boolean; onFinish: (prefs: Prefs) => void; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<Region>(initial.region);
  const [housing, setHousing] = useState<Housing>(initial.housing);
  const [activities, setActivities] = useState<Activity[]>(initial.activities);
  const [availableAfter, setAvailableAfter] = useState(initial.availableAfter);
  const [remindersOptIn, setRemindersOptIn] = useState(initial.remindersOptIn);

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useFocusTrap(rootRef, true, editing ? onSkip : undefined);
  useScrollLock(true);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(availableAfter);
  const canContinue = step !== 2 || (activities.length > 0 && validTime);
  const toggle = (value: Activity) =>
    setActivities((current) => (current.includes(value) ? current.filter((a) => a !== value) : [...current, value].slice(0, 3)));

  function next() {
    if (!canContinue) return;
    if (step < STEPS) setStep(step + 1);
    else onFinish({ region, housing, activities, availableAfter, remindersOptIn });
  }

  const titles = ["Which price zone are you in?", "How do you pay for electricity?", "What could you do at a better time?", "Want a heads-up before happy hours?"];

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-heading"
      className="fixed inset-0 z-50 h-dvh w-screen overflow-y-auto bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pt-[max(env(safe-area-inset-top),14px)] pb-[max(env(safe-area-inset-bottom),18px)]">
        <div className="flex h-12 items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" size="icon-lg" className="size-11 rounded-full" onClick={() => setStep(step - 1)} aria-label="Back">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
                <Zap className="size-4" />
              </span>
              WattHabit
            </span>
          )}
          <div className="flex flex-1 justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i <= Math.min(step, STEPS - 1) ? "bg-primary" : "bg-border")} />
            ))}
          </div>
          <Button variant="ghost" className="h-11 rounded-full px-3 text-muted-foreground" onClick={onSkip}>
            {editing ? "Close" : "Skip"}
          </Button>
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }} className="flex-1 pt-6">
          <p className="text-xs font-medium text-primary">{step < STEPS ? `Step ${step + 1} of ${STEPS}` : "Almost done"}</p>
          <h2 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="mt-1.5 text-[26px] leading-tight font-semibold tracking-tight outline-none">
            {titles[step]}
          </h2>

          {step === 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted-foreground">Sweden has four price zones. We use yours to check today&apos;s spot prices.</legend>
              <div className="mt-4 space-y-2.5">
                {REGIONS.map((r) => (
                  <label key={r.value} className={cn(option, region === r.value ? optionOn : optionOff)}>
                    <input type="radio" name="region" value={r.value} checked={region === r.value} onChange={() => setRegion(r.value)} className="sr-only" />
                    <span className="w-10 text-base font-semibold">{r.label}</span>
                    <span className="flex-1 text-sm text-muted-foreground">{r.hint}</span>
                    {region === r.value && <Check className="size-5 text-primary" aria-hidden="true" />}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted-foreground">This decides whether timing can save you money.</legend>
              <div className="mt-4 space-y-2.5">
                {HOUSING.map((h) => (
                  <label key={h.value} className={cn(option, "items-start", housing === h.value ? optionOn : optionOff)}>
                    <input type="radio" name="housing" value={h.value} checked={housing === h.value} onChange={() => setHousing(h.value)} className="sr-only" />
                    <span className="flex-1">
                      <span className="block text-base font-semibold">{h.label}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{h.hint}</span>
                    </span>
                    {housing === h.value && <Check className="mt-0.5 size-5 text-primary" aria-hidden="true" />}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <>
              <fieldset className="mt-6">
                <legend className="text-sm text-muted-foreground">Pick the activities that fit your routine.</legend>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {ACTIVITIES.map(({ value, label, hint, icon: Icon }) => {
                    const on = activities.includes(value);
                    return (
                      <label key={value} className={cn(option, "flex-col items-center gap-1.5 px-2 py-4 text-center", on ? optionOn : optionOff)}>
                        <input type="checkbox" name="activities" value={value} checked={on} onChange={() => toggle(value)} className="sr-only" />
                        <Icon className={cn("size-6", on ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-[11px] text-muted-foreground">{hint}</span>
                      </label>
                    );
                  })}
                </div>
                {activities.length === 0 && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    Pick at least one activity.
                  </p>
                )}
              </fieldset>
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
                <label htmlFor="available-after" className="text-base font-semibold">
                  Usually free after
                </label>
                <input
                  id="available-after"
                  type="time"
                  step={900}
                  value={availableAfter}
                  onChange={(e) => setAvailableAfter(e.target.value)}
                  className="min-h-11 rounded-xl border border-input bg-background px-3 text-base tabular-nums"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="mt-6">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary" aria-hidden="true">
                  <Bell className="size-5" />
                </span>
                <div className="flex-1">
                  <p id="reminder-optin-label" className="text-base font-semibold">
                    Remind me before happy hours
                  </p>
                  <p id="reminder-optin-hint" className="mt-0.5 text-sm leading-snug text-muted-foreground">
                    In-app reminders only. Push notifications are coming later.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={remindersOptIn}
                  aria-labelledby="reminder-optin-label"
                  aria-describedby="reminder-optin-hint"
                  onClick={() => setRemindersOptIn((v) => !v)}
                  className={cn("relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors", remindersOptIn ? "bg-primary" : "bg-input")}
                >
                  <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", remindersOptIn && "translate-x-5")} />
                </button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No sensors, no logging every appliance, no giant energy dashboard. Saved only in this browser.</p>
            </div>
          )}
        </motion.div>

        <Button className="mt-6 h-13 w-full rounded-full text-base font-semibold" onClick={next} disabled={!canContinue}>
          {step < STEPS ? "Continue" : editing ? "Save preferences" : "Start"}
        </Button>
      </div>
    </motion.div>
  );
}
