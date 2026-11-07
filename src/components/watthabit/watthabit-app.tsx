"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ChevronRight, Gift, Radar as RadarIcon, SlidersHorizontal, Sparkles, Sun, Target, Zap } from "lucide-react";
import type { CoachRequest, Housing, RewardsResponse } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { buildFallbackCoach, type LocalPriceContext } from "@/lib/mock/coach";
import { ACTIVITY_LABEL, HABITS, LEARN_CHALLENGE, PRICE_CHALLENGE_ID, priceServerId, type ServerChallengeId } from "@/lib/mock/challenges";
import { buildDemoOpportunities } from "@/lib/mock/opportunities";
import { buildDemoPrices } from "@/lib/mock/prices";
import { BADGES, DEMO_EXAMPLE_STAMPS, buildDemoVoucher } from "@/lib/mock/rewards";
import { formatStockholmTime, nextDate, stockholmDate } from "@/lib/mock/time";
import { cn } from "@/lib/utils";
import {
  buildReminders,
  buildSuggestions,
  choosePlan,
  currentLevel,
  happyHourNotice,
  isDemoDay,
  isUsefulPlan,
  streakDays,
  windowText,
  type InboxItem,
  type PriceDay,
} from "./advice";
import { getOpportunities, getPrices, getRewards, postCoach, postCompleteChallenge, postRedeem } from "./api";
import { ChallengesSection, type ChallengeCardModel } from "./challenges";
import { CoachSheet, type CoachMessage } from "./coach-sheet";
import { DEFAULT_PREFS, resetDemoState, updateDemoState, useDemoState, type Prefs } from "./demo-store";
import { InboxButton, InboxSheet, ReminderBanner, type BannerNotice } from "./notifications";
import { Onboarding } from "./onboarding";
import { ASSUMED_KWH } from "./price-window";
import { Radar, type RadarState } from "./radar";
import { RewardHero, RewardWidget } from "./reward-progress";
import { BadgesRow, DemoResetRow, PlusCard, VoucherCard } from "./rewards";
import { AdviceCard, PriceStripCard, TodayHeader, UpcomingReminders } from "./today";
import { useNowMinute } from "./use-now";

const NAV = [
  { id: "home", label: "Today", icon: Sun },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "radar", label: "Radar", icon: RadarIcon },
] as const;

const HOUSING_SHORT: Record<Housing, string> = { included: "Bill in rent", separate: "Own bill", unknown: "Bill unsure" };

type PricesLoaded = { region: string; today: PriceDay; tomorrow: PriceDay | null };
type Toast = { id: number; text: string; href?: string; link?: string };

function demoPrices(region: Prefs["region"], date: string, stamp: string): PriceDay {
  return { data: buildDemoPrices(region, date, stamp), fallback: true };
}

export function WattHabitApp() {
  const { state: demo, hydrated } = useDemoState();
  const nowMs = useNowMinute();
  const prefs = demo.prefs ?? DEFAULT_PREFS;
  const region = prefs.region;
  const activity = prefs.activities[0] ?? "laundry";
  const todayStr = nowMs === null ? null : stockholmDate(nowMs);

  const [editingPrefs, setEditingPrefs] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [prices, setPrices] = useState<PricesLoaded | null>(null);
  const [radar, setRadar] = useState<{ region: string; state: RadarState } | null>(null);
  const [serverRewards, setServerRewards] = useState<RewardsResponse | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachPrefill, setCoachPrefill] = useState({ text: "", key: 0 });
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [coachPending, setCoachPending] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<BannerNotice | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dropKey, setDropKey] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [active, setActive] = useState<string>("home");
  const bannerRef = useRef<HTMLDivElement>(null);

  /* ---------- Data loading (state is only set after await) ---------- */

  // Prices for today + tomorrow: contract API first, otherwise a clearly labelled demo curve.
  useEffect(() => {
    let cancelled = false;
    const date = stockholmDate(Date.now());
    const tomorrowDate = nextDate(date);
    (async () => {
      const [todayResult, tomorrowResult] = await Promise.allSettled([getPrices(region, date), getPrices(region, tomorrowDate)]);
      const stamp = new Date().toISOString();
      const today: PriceDay = todayResult.status === "fulfilled" ? { data: todayResult.value, fallback: false } : demoPrices(region, date, stamp);
      const tomorrow: PriceDay | null =
        tomorrowResult.status === "fulfilled" ? { data: tomorrowResult.value, fallback: false } : today.fallback ? demoPrices(region, tomorrowDate, stamp) : null;
      if (!cancelled) setPrices({ region, today, tomorrow });
    })();
    return () => {
      cancelled = true;
    };
  }, [region, reloadKey]);

  // Savings Radar: hide expired items; demo fallback is visibly labelled.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let state: RadarState;
      try {
        const data = await getOpportunities(region);
        const now = Date.now();
        state = { kind: "ready", items: data.opportunities.filter((o) => o.expiresAt === null || Date.parse(o.expiresAt) > now), fallback: false };
      } catch {
        state = { kind: "ready", items: buildDemoOpportunities(new Date().toISOString()).opportunities, fallback: true };
      }
      if (!cancelled) setRadar({ region, state });
    })();
    return () => {
      cancelled = true;
    };
  }, [region]);

  // Demo server wallet (if the rewards API is available); otherwise browser-local only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRewards();
        if (!cancelled) setServerRewards(data);
      } catch {
        /* Rewards API not available: browser-local demo. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Highlight the bottom-nav item for the section in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const { id } of NAV) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.href ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Auto-dismiss the reminder banner unless the user is interacting with it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      if (bannerRef.current?.contains(document.activeElement)) return;
      setNotice(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ---------- Derived state ---------- */

  const loaded = prices && prices.region === region ? prices : null;
  const todayDay = loaded?.today ?? null;
  const plan = useMemo(() => (loaded ? choosePlan(loaded.today, loaded.tomorrow, activity, prefs.availableAfter, nowMs) : null), [loaded, activity, prefs.availableAfter, nowMs]);
  const usefulPlan = isUsefulPlan(plan) ? plan : null;
  const nowLevel = useMemo(() => currentLevel(todayDay, nowMs), [todayDay, nowMs]);

  const isDone = (id: string) => todayStr !== null && demo.completions.some((c) => c.challengeId === id && c.day === todayStr);
  const isAccepted = (id: string) => todayStr !== null && demo.accepted.some((c) => c.challengeId === id && c.day === todayStr);

  const suggestions = buildSuggestions(plan, activity, isDone);
  const visibleSuggestions = suggestions.filter((s) => !skipped.includes(s.id));
  const hero = visibleSuggestions[0] ?? null;
  const heroLoading = loaded === null || todayStr === null;

  const reminders = buildReminders({ plan, activity, optIn: prefs.remindersOptIn, availableAfter: prefs.availableAfter, accepted: isAccepted, done: isDone });

  const full = demo.progress >= demo.goal;
  const inbox: InboxItem[] = [];
  if (usefulPlan) inbox.push(happyHourNotice(usefulPlan, activity));
  if (full) inbox.push({ id: "reward-unlocked", kind: "reward", title: "Reward unlocked", body: "A demo voucher is waiting in your wallet. Demo only — not redeemable." });
  const unread = inbox.filter((i) => !readIds.includes(i.id)).length;

  const serverVoucher = serverRewards?.vouchers[0] ?? null;
  const voucherFromServer = full && serverVoucher !== null && (!serverVoucher.isRedeemed || demo.voucherRedeemed);
  const voucher = !full ? null : voucherFromServer ? serverVoucher : buildDemoVoucher(demo.voucherRedeemed);

  const everDone = new Set(demo.completions.map((c) => c.challengeId));
  const earnedBadges = new Set<string>(BADGES.filter((b) => (b.challengeId ? everDone.has(b.challengeId) : full)).map((b) => b.id));
  const streak = streakDays(demo.completions.map((c) => c.day), todayStr);

  const localContext: LocalPriceContext = usefulPlan
    ? {
        windowText: windowText(usefulPlan.plan),
        dayWord: usefulPlan.dayWord,
        cheapAvg: usefulPlan.plan.cheapest.avgSekPerKwh,
        baselineAvg: usefulPlan.plan.baseline.avgSekPerKwh,
        baselineStart: formatStockholmTime(usefulPlan.plan.baseline.startsAt),
        demo: isDemoDay(usefulPlan.source),
      }
    : null;

  const label = ACTIVITY_LABEL[activity];
  const priceTomorrow = usefulPlan?.day === "tomorrow";
  const cards: ChallengeCardModel[] = [
    {
      id: PRICE_CHALLENGE_ID,
      kind: "price",
      title: `Daily price challenge · ${label.name}`,
      line: usefulPlan
        ? `Run planned ${label.noun} in ${priceTomorrow ? "tomorrow's" : "today's"} happy hour, ${windowText(usefulPlan.plan)}.`
        : `Run planned ${label.noun} in a cheaper window when there is one.`,
      estimateLabel: "Estimate",
      estimate: usefulPlan
        ? `≈ ${usefulPlan.plan.estimatedDiffSek.toFixed(2)} SEK lower spot cost per ${label.unit} (assumes ~${ASSUMED_KWH} kWh, before VAT and fees). Shifting doesn't reduce kWh.`
        : "Shifting changes when you use energy, not how much. Savings depend on your contract.",
      accepted: isAccepted(PRICE_CHALLENGE_ID),
      done: isDone(PRICE_CHALLENGE_ID),
      canAccept: usefulPlan !== null,
      canComplete: usefulPlan !== null && !priceTomorrow,
      note: !usefulPlan ? (loaded ? "No clear happy hour left today." : "Checking prices…") : priceTomorrow ? "The happy hour is tomorrow — stamp it then." : null,
      acceptedNote: usefulPlan ? `Reminder set for ${priceTomorrow ? "tomorrow " : ""}${usefulPlan.reminderAt}` : "Accepted",
    },
    ...HABITS.map(
      (h): ChallengeCardModel => ({
        id: h.id,
        kind: "habit",
        title: h.title,
        line: h.line,
        estimateLabel: "Modeled estimate",
        estimate: `≈ ${h.kwhPerDay.toFixed(2)} kWh less per day (${h.assumption}). Self-reported, not measured.`,
        accepted: isAccepted(h.id),
        done: isDone(h.id),
        canAccept: true,
        canComplete: true,
        note: null,
        acceptedNote: "Accepted for today",
      }),
    ),
    {
      id: LEARN_CHALLENGE.id,
      kind: "learn",
      title: LEARN_CHALLENGE.title,
      line: LEARN_CHALLENGE.line,
      estimateLabel: "Why it matters",
      estimate: "A cheaper hour lowers the price per kWh, not the kWh you use.",
      accepted: isAccepted(LEARN_CHALLENGE.id),
      done: isDone(LEARN_CHALLENGE.id),
      canAccept: true,
      canComplete: true,
      note: null,
      acceptedNote: "Accepted",
    },
  ];
  const doneTodayCount = cards.filter((c) => c.done).length;

  /* ---------- Actions ---------- */

  function announce(text: string) {
    setAnnouncement(text);
  }

  function showToast(next: Omit<Toast, "id">) {
    setToast({ id: Date.now(), ...next });
    announce(next.text);
  }

  function whyQuestion(id: string): string {
    if (id === PRICE_CHALLENGE_ID) return usefulPlan ? `Why is ${windowText(usefulPlan.plan)} a good time for ${label.noun}?` : "Why this time?";
    if (id === LEARN_CHALLENGE.id) return LEARN_CHALLENGE.coachQuestion;
    return HABITS.find((h) => h.id === id)?.coachQuestion ?? "";
  }

  function openCoach(prefill = "") {
    setCoachPrefill((p) => ({ text: prefill, key: p.key + 1 }));
    setCoachOpen(true);
  }

  async function askCoach(raw: string) {
    const message = raw.trim().slice(0, 1200);
    if (!message || coachPending) return;
    setCoachPending(true);
    setMessages((m) => [...m, { id: m.length, role: "user", text: message }]);
    // priceSummary stays null: the coach route does not trust client price facts (docs/AI_INTEGRATION.md).
    const request: CoachRequest = { region, housing: prefs.housing, activities: prefs.activities, availableAfter: prefs.availableAfter, priceSummary: null, message };
    let reply: Omit<CoachMessage, "id">;
    try {
      const r = await postCoach(request);
      reply = { role: "coach", text: r.reply, source: r.source === "groq" ? "ai" : "offline", model: r.model, disclaimer: r.disclaimer, quest: r.quest };
    } catch {
      const r = buildFallbackCoach(request, localContext);
      reply = { role: "coach", text: r.reply, source: "offline", model: null, disclaimer: r.disclaimer, quest: r.quest };
    }
    setMessages((m) => [...m, { id: m.length, ...reply }]);
    setCoachPending(false);
  }

  function accept(id: string) {
    const day = stockholmDate(Date.now());
    updateDemoState((s) => ({ ...s, accepted: [...s.accepted.filter((a) => !(a.challengeId === id && a.day === day)), { challengeId: id, day }] }));
    announce(id === PRICE_CHALLENGE_ID && usefulPlan ? `Reminder set for ${priceTomorrow ? "tomorrow " : ""}${usefulPlan.reminderAt}` : "Challenge accepted for today");
  }

  async function recordOnServer(serverId: ServerChallengeId) {
    try {
      await postCompleteChallenge({ challengeId: serverId });
      setServerRewards(await getRewards());
    } catch {
      /* Server unavailable or ID not allowlisted: the browser-local demo continues. */
    }
  }

  function complete(id: string) {
    const day = stockholmDate(Date.now());
    if (demo.completions.some((c) => c.challengeId === id && c.day === day)) {
      showToast({ text: "Already counted today — come back tomorrow." });
      return;
    }
    const before = demo.progress;
    const after = Math.min(demo.goal, before + 1);
    updateDemoState((s) => ({
      ...s,
      progress: Math.min(s.goal, s.progress + 1),
      completions: [...s.completions, { challengeId: id, day }],
      accepted: s.accepted.some((a) => a.challengeId === id && a.day === day) ? s.accepted : [...s.accepted, { challengeId: id, day }],
    }));
    setDropKey((k) => k + 1);
    if (after >= demo.goal && before < demo.goal) {
      setCelebrateKey((k) => k + 1);
      showToast({ text: "Reward unlocked!", href: "#rewards", link: "Open wallet" });
    } else if (after > before) {
      showToast({ text: `Stamp added · ${after}/${demo.goal}` });
    } else {
      showToast({ text: "Done! Your cup is already full." });
    }
    const serverId = id === PRICE_CHALLENGE_ID ? priceServerId(activity) : id === LEARN_CHALLENGE.id ? LEARN_CHALLENGE.serverId : null;
    if (serverId) void recordOnServer(serverId);
  }

  async function redeem() {
    if (!voucher || voucher.isRedeemed || redeeming) return;
    setRedeeming(true);
    if (voucherFromServer && serverVoucher) {
      try {
        const result = await postRedeem({ voucherId: serverVoucher.id, code: serverVoucher.code });
        if (result.status === "invalid") {
          setRedeemMessage("The demo server rejected this code.");
        } else {
          setServerRewards((r) => (r ? { ...r, vouchers: r.vouchers.map((v) => (v.id === serverVoucher.id ? { ...v, isRedeemed: true } : v)) } : r));
          updateDemoState((s) => ({ ...s, voucherRedeemed: true }));
          setRedeemMessage(result.status === "redeemed" ? "Marked as redeemed on the demo server. Nothing of value was issued." : "This demo voucher was already redeemed.");
        }
      } catch {
        setRedeemMessage("Couldn't reach the rewards service. Try again in a moment.");
      }
    } else {
      updateDemoState((s) => ({ ...s, voucherRedeemed: true }));
      setRedeemMessage("Marked as redeemed in this browser (demo). Nothing of value was issued.");
    }
    setRedeeming(false);
  }

  function previewReminder() {
    if (usefulPlan) {
      const item = happyHourNotice(usefulPlan, activity);
      setNotice({ id: Date.now(), kind: "happy-hour", title: item.title, body: `${item.body} Reminder at ${usefulPlan.reminderAt}.` });
      announce(`Reminder preview: ${item.title}`);
    } else {
      const habit = HABITS.find((h) => !isDone(h.id)) ?? HABITS[0];
      setNotice({ id: Date.now(), kind: "habit", title: `Evening check: ${habit.title.toLowerCase()}`, body: habit.line });
      announce(`Reminder preview: ${habit.title}`);
    }
  }

  function viewFromBanner() {
    setNotice(null);
    document.getElementById("advice-title")?.scrollIntoView({ block: "center" });
  }

  function openInbox() {
    setReadIds((ids) => [...new Set([...ids, ...inbox.map((i) => i.id)])]);
    setInboxOpen(true);
  }

  function loadDemoPrices() {
    const date = stockholmDate(Date.now());
    const stamp = new Date().toISOString();
    setPrices({ region, today: demoPrices(region, date, stamp), tomorrow: demoPrices(region, nextDate(date), stamp) });
  }

  function resetDemo() {
    resetDemoState();
    setSkipped([]);
    setRedeemMessage(null);
    setReadIds([]);
    setEditingPrefs(false);
    showToast({ text: "Demo reset — back to 3/5 example stamps." });
  }

  const onboardingOpen = hydrated && (demo.prefs === null || editingPrefs);
  const radarState: RadarState = radar && radar.region === region ? radar.state : { kind: "loading" };

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[440px] items-center justify-between gap-2 px-4">
          <a href="#home" className="inline-flex min-h-11 items-center gap-2 text-[17px] font-bold tracking-tight" aria-label="WattHabit — go to Today">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
              <Zap className="size-4" />
            </span>
            WattHabit
          </a>
          <div className="flex items-center gap-1">
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Demo · {region}</span>
            <InboxButton unread={unread} onOpen={openInbox} />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-[440px] px-4 pb-32 outline-none">
        {/* TODAY */}
        <section id="home" aria-labelledby="home-title" className="scroll-mt-16 space-y-4 pt-5">
          <TodayHeader nowMs={nowMs} today={todayDay} now={nowLevel} />
          <AdviceCard
            suggestion={hero}
            loading={heroLoading}
            state={{ accepted: hero ? isAccepted(hero.id) : false, done: hero ? isDone(hero.id) : false }}
            housing={prefs.housing}
            onAccept={() => hero && accept(hero.id)}
            onSkip={() => hero && setSkipped((s) => [...s, hero.id])}
            onWhy={() => openCoach(hero ? whyQuestion(hero.id) : "")}
            onDone={() => hero && complete(hero.id)}
            onShowSkipped={() => setSkipped([])}
            hasSkipped={skipped.length > 0 && suggestions.length > 0}
          />
          <RewardWidget progress={demo.progress} goal={demo.goal} exampleStamps={Math.min(DEMO_EXAMPLE_STAMPS, demo.progress)} dropKey={dropKey} celebrateKey={celebrateKey} />
          <PriceStripCard plan={plan} today={todayDay} nowMs={nowMs} onRetry={() => setReloadKey((k) => k + 1)} onUseDemo={loadDemoPrices} />
          <UpcomingReminders rows={reminders} onPreview={previewReminder} />
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {region} · {HOUSING_SHORT[prefs.housing]} · {prefs.activities.join(", ")} after {prefs.availableAfter}
            </p>
            <Button variant="ghost" className="h-10 shrink-0 rounded-full px-3 text-primary" onClick={() => setEditingPrefs(true)}>
              <SlidersHorizontal aria-hidden="true" /> Edit preferences
            </Button>
          </div>
        </section>

        {/* CHALLENGES */}
        <section id="challenges" aria-labelledby="challenges-title" className="scroll-mt-16 pt-10">
          <SectionHeading id="challenges-title" title="Challenges" sub="Small, self-reported actions. Accept, do it, stamp it." />
          <ChallengesSection
            cards={cards}
            streak={streak}
            doneToday={doneTodayCount}
            onAccept={accept}
            onDone={complete}
            onWhy={(id) => openCoach(whyQuestion(id))}
          />
          <button
            type="button"
            onClick={() => openCoach()}
            aria-haspopup="dialog"
            className="mt-4 flex w-full items-center gap-3 rounded-[22px] border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
              <Sparkles className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Ask WattHabit</span>
              <span className="block text-xs text-muted-foreground">Why this time? Will it lower my bill?</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </section>

        {/* REWARDS */}
        <section id="rewards" aria-labelledby="rewards-title" className="scroll-mt-16 pt-10">
          <SectionHeading id="rewards-title" title="Rewards" sub="Complete challenges to fill the cup. Digital rewards are free." />
          <div className="space-y-3">
            <RewardHero progress={demo.progress} goal={demo.goal} exampleStamps={Math.min(DEMO_EXAMPLE_STAMPS, demo.progress)} dropKey={dropKey} celebrateKey={celebrateKey} />
            <BadgesRow earned={earnedBadges} />
            <VoucherCard
              voucher={voucher}
              progress={demo.progress}
              goal={demo.goal}
              serverBacked={voucherFromServer}
              redeeming={redeeming}
              message={redeemMessage}
              onRedeem={() => void redeem()}
            />
            <DemoResetRow onReset={resetDemo} />
            <PlusCard />
          </div>
        </section>

        {/* RADAR */}
        <section id="radar" aria-labelledby="radar-title" className="scroll-mt-16 pt-10">
          <SectionHeading id="radar-title" title="Savings Radar" sub="Verified energy news & incentives." />
          <Radar state={radarState} />
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-[11px] leading-relaxed text-muted-foreground">
          <p className="text-sm font-bold text-foreground">WattHabit</p>
          <p className="mt-2">Stamps reflect participation, not verified electricity savings.</p>
          <p className="mt-1">Spot prices exclude VAT, taxes, grid fees and retailer margins. Your tariff decides whether shifting saves money.</p>
          <p className="mt-1">Made for student life in Sweden.</p>
        </footer>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-3 rounded-full bg-foreground px-4 py-2.5 text-sm text-background shadow-lg"
          >
            <span>{toast.text}</span>
            {toast.href && (
              <a href={toast.href} onClick={() => setToast(null)} className="font-semibold text-white underline underline-offset-4">
                {toast.link}
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-[440px] grid-cols-4">
          {NAV.map(({ id, label: navLabel, icon: Icon }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => setActive(id)}
                  className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors", isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {isActive && <motion.span layoutId="nav-indicator" className="absolute top-1.5 h-1 w-6 rounded-full bg-primary" aria-hidden="true" />}
                  <Icon className="size-5" aria-hidden="true" />
                  {navLabel}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <ReminderBanner notice={notice} bannerRef={bannerRef} onView={viewFromBanner} onClose={() => setNotice(null)} />

      <CoachSheet
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        messages={messages}
        pending={coachPending}
        onAsk={(text) => void askCoach(text)}
        prefill={coachPrefill.text}
        prefillKey={coachPrefill.key}
      />
      <InboxSheet
        open={inboxOpen}
        items={inbox}
        onClose={() => setInboxOpen(false)}
        onPreview={() => {
          setInboxOpen(false);
          previewReminder();
        }}
      />

      <AnimatePresence>
        {onboardingOpen && (
          <Onboarding
            key="onboarding"
            initial={prefs}
            editing={demo.prefs !== null}
            onFinish={(next) => {
              updateDemoState((s) => ({ ...s, prefs: next }));
              setEditingPrefs(false);
              setSkipped([]);
            }}
            onSkip={() => {
              if (demo.prefs) setEditingPrefs(false);
              else updateDemoState((s) => ({ ...s, prefs: s.prefs ?? DEFAULT_PREFS }));
            }}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function SectionHeading({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-[22px] font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
