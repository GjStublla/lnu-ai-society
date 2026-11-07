import type { CoachRequest, CoachResponse } from "@/types/contracts";

/** Facts the client already shows on screen (from live or clearly-labelled demo prices). */
export type LocalPriceContext = {
  windowText: string; // e.g. "22:00–00:00"
  dayWord: string; // "tonight" | "today" | "tomorrow"
  cheapAvg: number;
  baselineAvg: number;
  baselineStart: string; // "18:00"
  demo: boolean;
} | null;

type Intent = "rent" | "bill" | "kwh" | "habit" | "timing";

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/\brent\b|included|hyra/.test(m)) return "rent";
  if (/bill|lower|cheaper|money|cost|sek|pay/.test(m)) return "bill";
  if (/kwh|shift|consum|less energy|use less/.test(m)) return "kwh";
  if (/standby|computer|sleep|light|lamp|\bw\b|watt/.test(m)) return "habit";
  return "timing";
}

const ACTIVITY_NOUN: Record<string, string> = { laundry: "laundry", dishwasher: "the dishwasher", charging: "charging" };

/**
 * Deterministic "Offline guidance" used when /api/coach is unreachable.
 * Mirrors the CoachResponse contract; never invents measurements, offers or rewards.
 */
export function buildFallbackCoach(request: CoachRequest, context: LocalPriceContext): CoachResponse {
  const activity = ACTIVITY_NOUN[request.activities[0] ?? "laundry"] ?? "a planned load";
  const intent = detectIntent(request.message);
  let reply: string;

  switch (intent) {
    case "rent":
      reply =
        "If electricity is included in your rent, timing won't change your bill. Moving a load to a cheaper hour can still ease demand at busy times, and switching off standby or idle devices uses fewer kWh — the saving just lands on your landlord's bill, not yours. Stamps count the habit either way.";
      break;
    case "bill":
      reply =
        request.housing === "included"
          ? "Probably not your bill: electricity is included in your rent. The habits still use fewer kWh (standby, sleep, lights), and timing helps the grid at busy hours."
          : request.housing === "separate"
            ? "Only if your contract follows spot prices hour by hour or quarter by quarter (often called timpris). With a fixed price or a monthly-average variable price, timing barely changes the bill. Using fewer kWh — like switching off standby — lowers any per-kWh bill."
            : "It depends on your contract. A spot/hourly price contract (often called timpris) rewards good timing; a fixed price or monthly-average variable price mostly doesn't. Using fewer kWh lowers any per-kWh bill.";
      break;
    case "kwh":
      reply = `No — shifting changes when you use electricity, not how much. A ~1 kWh ${activity === "charging" ? "charge" : "load"} uses about the same energy at any hour. Real kWh reductions come from habits like switching off a ~30 W standby load or letting an idle computer sleep.`;
      break;
    case "habit":
      reply =
        "Small always-on loads add up: 30 W left on for 10 hours is about 0.3 kWh, and a 60 W computer idling for 8 hours is about 0.5 kWh. These are modeled estimates — WattHabit doesn't measure your devices. Unlike shifting, these habits do reduce kWh.";
      break;
    default:
      reply = context
        ? `${context.windowText} ${context.dayWord} is the lowest-priced block that fits after your free time: about ${context.cheapAvg.toFixed(2)} SEK/kWh vs ${context.baselineAvg.toFixed(2)} if you start at ${context.baselineStart}${context.demo ? " (demo prices)" : ""}. Spot prices drop when demand is low. Moving ${activity} there changes when you use electricity, not how much.`
        : `Spot prices are usually lower late in the evening and at night, when demand is low. Moving ${activity} there changes when you use electricity, not how much.`;
      if (request.housing === "included") reply += " Since electricity is in your rent, your bill won't change.";
      else if (request.housing === "unknown") reply += " It only saves money on a spot-price contract.";
  }

  return {
    reply,
    quest: null,
    disclaimer: "Offline guidance — written rules, no AI model was called. Spot prices exclude VAT, taxes, grid fees and retailer margins.",
    source: "fallback",
    model: null,
  };
}
