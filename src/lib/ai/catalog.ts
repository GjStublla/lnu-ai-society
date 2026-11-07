import "server-only";
import type { CoachRequest, CoachResponse, Quest } from "../../types/contracts.ts";

export const PRICE_SOURCE = "https://www.elprisetjustnu.se/elpris-api";
export const TOPICS = ["start", "shift", "tariff", "included", "prices", "laundry", "charging", "efficiency", "rewards", "safety", "scope"] as const;
export type CoachTopic = (typeof TOPICS)[number];

// Reviewed text only: a model selects a topic; its prose never reaches the client.
export const GUIDANCE: Record<CoachTopic, string> = {
  start: "Pick one flexible activity that fits your routine. When verified prices are connected, compare a complete time window before moving the task.",
  shift: "Moving a task changes when you use electricity, not automatically how many kWh you use. A lower spot price may lower cost only if your tariff follows it.",
  tariff: "Check whether your electricity contract follows time-varying spot prices. A fixed-price contract may not reward moving the same load to another time.",
  included: "If electricity is included in your rent, shifting a task may not change your own bill. Focus on participation and habits that fit your routine.",
  prices: "I don't have a verified live price window here yet. Check the price source for your region and choose a continuous window that fits the whole task.",
  laundry: "Choose a laundry time that suits your routine. Compare a complete price window when verified prices are available, keeping the same assumed load for both times.",
  charging: "If charging is flexible, choose a time that fits your routine. Compare applicable prices when a verified window is available; I can't calculate personal savings here.",
  efficiency: "Turning off or putting a computer to sleep can reduce the electricity it uses while idle, though sleep mode may still use some power. Switch off lights when you leave a room, and unplug standby devices only when it is safe and practical.",
  rewards: "Stamps reflect participation, not measured electricity savings. Any voucher in this demo is DEMO — NOT REDEEMABLE; no café benefit is promised.",
  safety: "Only choose activities you can safely reschedule and follow appliance instructions. Keep essential equipment running; focus on flexible laundry or charging.",
  scope: "I can help with electricity habits, tariff basics and demo challenges. I can't verify personal usage, bill savings or partner offers.",
};

export function chooseFallbackTopic(input: CoachRequest): CoachTopic {
  const message = input.message.normalize("NFKC").toLowerCase();
  if (/fridge|freezer|medical|essential|unsafe|overnight|unattended/.test(message)) return "safety";
  if (/voucher|coupon|reward|stamp|free coffee|partner/.test(message)) return "rewards";
  if (/computer|laptop|desktop|standby|sleep mode|sleeping|idle device|turn off|switch off|unplug|light(?:s|ing)?/.test(message)) return "efficiency";
  if (/included|rent/.test(message)) return "included";
  if (/fixed|tariff|contract/.test(message)) return "tariff";
  if (/kwh|kilowatt|reduce|measured|co2|carbon/.test(message)) return "shift";
  if (/price|cheapest|window|tomorrow|today|when|sek|save|saving/.test(message)) return "prices";
  if (/laundry|wash/.test(message)) return "laundry";
  if (/charg/.test(message)) return "charging";
  return input.housing === "included" ? "included" : "start";
}

function makeQuest(input: CoachRequest, topic: CoachTopic): Quest | null {
  if (["efficiency", "rewards", "safety", "scope"].includes(topic)) return null;
  const activity = input.activities[0];
  const titles: Record<string, string> = {
    laundry: "Plan your next laundry load",
    dishwasher: "Plan your next dishwasher cycle",
    charging: "Plan a flexible charging time",
  };
  return {
    id: activity ? `plan-${activity}` : "learn-spot-prices",
    title: activity ? titles[activity] : "Learn what a spot price includes",
    description: activity
      ? `Choose a time that fits your routine${input.availableAfter ? ` after ${input.availableAfter}` : ""}. Wait for a verified full price window before making a price-based change.`
      : "Read the price source and check which electricity costs your own contract includes.",
    evidenceSource: PRICE_SOURCE,
    estimatedImpact: null,
  };
}

export function buildCoachResponse(input: CoachRequest, topic: CoachTopic, model: string | null = null): CoachResponse {
  // The caller validates activities; availability is a preference, never a claimed cheap window.
  const billingNote = input.housing === "included" && topic !== "included"
    ? " With electricity included in rent, your own bill may not change."
    : input.housing === "unknown" && topic !== "tariff"
      ? " Check your tariff before expecting bill savings."
      : "";
  return {
    reply: GUIDANCE[topic] + billingNote,
    quest: makeQuest(input, topic),
    disclaimer: `${model ? "Groq selected reviewed guidance." : "AI unavailable — written fallback guidance."} No live price window is verified here. Spot prices exclude VAT, taxes, grid charges and retailer margins.`,
    source: model ? "groq" : "fallback",
    model,
  };
}
