import assert from "node:assert/strict";
import { test } from "node:test";
import type { CoachRequest, PricesResponse } from "../../types/contracts.ts";
import { contextFromPrices, verifiedWindowExplanation } from "./context.ts";
import { getCoachResponse } from "./coach.ts";

const input: CoachRequest = { region: "SE4", housing: "separate", activities: ["charging"], availableAfter: "18:00", priceSummary: null, message: "Why this time?" };
const now = new Date("2026-11-07T12:00:00Z");
function prices(): PricesResponse {
  return { region: "SE4", date: "2026-11-07", currency: "SEK", unit: "SEK/kWh", sourceUrl: "https://www.elprisetjustnu.se/api/v1/prices/2026/11-07_SE4.json", status: "live", updatedAt: now.toISOString(), intervals: Array.from({length: 12}, (_, i) => ({ startsAt: new Date(Date.parse("2026-11-07T17:00Z") + i * 900_000).toISOString(), endsAt: new Date(Date.parse("2026-11-07T17:00Z") + (i + 1) * 900_000).toISOString(), sekPerKwh: i < 4 ? 1 : 0.25 })) };
}
test("server context chooses a complete available window with real source provenance", () => {
  const context = contextFromPrices(input, prices(), now)!;
  assert.equal(context.startsAt, "2026-11-07T18:00:00.000Z");
  assert.equal(context.endsAt, "2026-11-07T19:00:00.000Z");
  assert.equal(context.averageSekPerKwh, 0.25);
  assert.equal(context.baselineSekPerKwh, 1);
  assert.match(verifiedWindowExplanation(context), /Europe\/Stockholm/);
});
test("demo, stale, wrong-source and wrong-region data cannot ground coach claims", () => {
  for (const override of [{status:"demo"}, {status:"unavailable"}, {sourceUrl:"https://evil.invalid"}, {region:"SE3"}, {updatedAt:"2026-10-01T00:00:00Z"}]) assert.equal(contextFromPrices(input, {...prices(),...override} as PricesResponse, now), null);
});
test("verified prices enrich key-free guidance while impacts stay null", async () => {
  const result = await getCoachResponse(input, {env:{},priceContext:contextFromPrices(input,prices(),now)});
  assert.equal(result.source,"fallback"); assert.equal(result.model,null);
  assert.match(result.reply,/0.25 SEK\/kWh/); assert.match(result.reply,/not its kWh/);
  assert.equal(result.quest?.evidenceSource,prices().sourceUrl); assert.equal(result.quest?.estimatedImpact,null);
  assert.doesNotMatch(result.disclaimer!,/No live price window/);
});

test("verified prices do not replace tariff or device-efficiency guidance", async () => {
  const context = contextFromPrices(input, prices(), now)!;
  const tariff = await getCoachResponse({ ...input, message: "Does a fixed tariff benefit from moving laundry?" }, { env: {}, priceContext: context });
  assert.match(tariff.reply, /fixed-price contract may not reward moving the same load/);
  assert.doesNotMatch(tariff.reply, /complete 60-minute window/);
  assert.match(tariff.disclaimer!, /Verified server price data/);

  const efficiency = await getCoachResponse({ ...input, message: "Does putting my computer to sleep save kWh?" }, { env: {}, priceContext: context });
  assert.match(efficiency.reply, /putting a computer to sleep can reduce the electricity it uses while idle/);
  assert.match(efficiency.reply, /sleep mode may still use some power/);
  assert.doesNotMatch(efficiency.reply, /complete 60-minute window|changes when electricity is used/);
  assert.equal(efficiency.quest, null);
  assert.match(efficiency.disclaimer!, /Verified server price data/);
});
