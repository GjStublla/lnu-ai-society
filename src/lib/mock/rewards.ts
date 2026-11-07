import type { Reward } from "@/types/contracts";

export const DEMO_GOAL = 5;
export const DEMO_EXAMPLE_STAMPS = 3;

/** Browser-local demo voucher. DEMO — NOT REDEEMABLE; not a server-validated entitlement. */
export function buildDemoVoucher(isRedeemed: boolean): Reward {
  return {
    id: "demo-local-voucher",
    title: "Demo coffee voucher",
    code: "DEMO-WH-0005",
    isRedeemed,
    demo: true,
  };
}

/** Free digital badges. Earned from self-reported participation only. */
export const BADGES = [
  { id: "price", title: "Off-peak planner", challengeId: "price" },
  { id: "standby", title: "Standby check", challengeId: "standby-30w" },
  { id: "sleep", title: "Sleep mode", challengeId: "computer-sleep-60w" },
  { id: "lights", title: "Lights out", challengeId: "lights-15w" },
  { id: "learn", title: "Shift explained", challengeId: "learn-shifting" },
  { id: "full", title: "Full cup", challengeId: null },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];
