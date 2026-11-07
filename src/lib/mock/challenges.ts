// Challenge catalog for the demo. Habit numbers are MODELED estimates with
// explicit assumptions — self-reported participation, never measured savings.
import type { Activity } from "./types";

/** IDs Alex's /api/challenges/complete currently allowlists (see docs/CONTRACT.md §4). */
export type ServerChallengeId = "plan-laundry" | "plan-dishwasher" | "plan-charging" | "learn-spot-prices";

export type HabitChallenge = {
  id: "standby-30w" | "computer-sleep-60w" | "lights-15w";
  title: string;
  line: string;
  watts: number;
  hours: number;
  /** Modeled kWh avoided per day = watts × hours / 1000. */
  kwhPerDay: number;
  assumption: string;
  coachQuestion: string;
};

const habit = (id: HabitChallenge["id"], title: string, line: string, watts: number, hours: number, what: string, coachQuestion: string): HabitChallenge => ({
  id,
  title,
  line,
  watts,
  hours,
  kwhPerDay: (watts * hours) / 1000,
  assumption: `${watts} W × ~${hours} h ${what}`,
  coachQuestion,
});

export const HABITS: HabitChallenge[] = [
  habit("standby-30w", "Kill standby", "Turn off a ~30 W device left on standby — TV box, speaker or monitor.", 30, 10, "it would otherwise stay on", "How much does a 30 W standby load use?"),
  habit("computer-sleep-60w", "Sleep your computer", "Let an unused ~60 W desktop and screen sleep instead of idling.", 60, 8, "it would otherwise idle", "Does putting my computer to sleep save kWh?"),
  habit("lights-15w", "Lights off", "Switch off ~15 W of lighting in a room you're not using.", 15, 4, "they would otherwise stay on", "Do small lights really matter?"),
];

export const LEARN_CHALLENGE = {
  id: "learn-shifting",
  serverId: "learn-spot-prices" as ServerChallengeId,
  title: "Shifting ≠ saving kWh",
  line: "A 20-second read: timing changes when you use energy, not how much.",
  coachQuestion: "Does shifting save kWh?",
} as const;

export const PRICE_CHALLENGE_ID = "price";

export const ACTIVITY_LABEL: Record<Activity, { name: string; noun: string; unit: string }> = {
  laundry: { name: "Laundry", noun: "laundry", unit: "wash" },
  dishwasher: { name: "Dishwasher", noun: "dishwasher", unit: "run" },
  charging: { name: "Charging", noun: "charging", unit: "charge" },
};

export function priceServerId(activity: Activity): ServerChallengeId {
  return `plan-${activity}`;
}

export const ALL_CHALLENGE_IDS: string[] = [PRICE_CHALLENGE_ID, ...HABITS.map((h) => h.id), LEARN_CHALLENGE.id];
