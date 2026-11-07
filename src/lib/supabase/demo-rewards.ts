import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import type { CompleteChallengeResponse, RedeemResponse, RewardsResponse } from "@/types/contracts";

export const challengeIds = ["plan-laundry", "plan-dishwasher", "plan-charging", "learn-spot-prices"] as const;
export type ChallengeId = (typeof challengeIds)[number];

export const demoVoucher = {
  id: "demo-coffee",
  title: "Demo coffee voucher (DEMO — NOT REDEEMABLE)",
  code: "DEMO-COFFEE",
  demo: true,
} as const;

const goal = 5;
const cookieName = "watthabit_demo_rewards";
const maxPoints = 10_000;
const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const stateSchema = z.strictObject({
  points: z.number().int().min(0).max(maxPoints),
  completedOn: z.partialRecord(z.enum(challengeIds), z.iso.date()),
  redeemed: z.boolean(),
});

async function openDemo() {
  const jar = await cookies();
  let state: z.infer<typeof stateSchema> = { points: 3, completedOn: {}, redeemed: false };
  try {
    const raw = jar.get(cookieName)?.value;
    const result = raw && stateSchema.safeParse(JSON.parse(raw));
    if (result && result.success) state = result.data;
  } catch {
    // An invalid demo cookie starts a new game.
  }
  return {
    state,
    save() {
      jar.set(cookieName, JSON.stringify(state), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api",
        maxAge: 30 * 24 * 60 * 60,
      });
    },
  };
}

export async function getDemoRewards(): Promise<RewardsResponse> {
  const { state } = await openDemo();
  return {
    points: state.points,
    progress: Math.min(state.points, goal),
    goal,
    vouchers: state.points >= goal ? [{ ...demoVoucher, isRedeemed: state.redeemed }] : [],
  };
}

export async function completeDemoChallenge(challengeId: ChallengeId): Promise<CompleteChallengeResponse> {
  const { state, save } = await openDemo();
  const today = dayFormat.format();
  if (state.completedOn[challengeId] !== today) {
    state.completedOn[challengeId] = today;
    state.points = Math.min(state.points + 1, maxPoints);
    save();
  }
  return {
    progress: Math.min(state.points, goal),
    goal,
    rewardUnlocked: state.points >= goal,
    demo: true,
  };
}

export async function redeemDemoVoucher(): Promise<RedeemResponse> {
  const { state, save } = await openDemo();
  if (state.points < goal) return { status: "invalid", demo: true };
  if (state.redeemed) return { status: "already_redeemed", demo: true };
  state.redeemed = true;
  save();
  return { status: "redeemed", demo: true };
}