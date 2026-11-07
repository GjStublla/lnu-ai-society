// Public, no-login deployment acceptance. Defaults to no paid coach call.
// Usage: node scripts/demo-workflows.mjs --url https://demo.example
//        node scripts/demo-workflows.mjs --url https://demo.example --live-coach
import assert from "node:assert/strict";

const args = process.argv.slice(2);
const urlArg = args.indexOf("--url");
if (urlArg < 0 || !args[urlArg + 1]) throw new Error("Usage: node scripts/demo-workflows.mjs --url https://host [--live-coach]");
const base = new URL(args[urlArg + 1]);
const liveCoach = args.includes("--live-coach");
async function get(path, options = {}) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(12_000) });
}
function browser() {
  let cookie;
  return async (path, body, expected = 200) => {
    const response = await get(path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    assert.equal(response.status, expected, `${path}: ${await response.clone().text()}`);
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const rewardCookie = setCookies.find((value) => value.startsWith("watthabit_demo_rewards="));
    if (rewardCookie) {
      assert.match(rewardCookie, /; HttpOnly/i);
      assert.match(rewardCookie, /; SameSite=lax/i);
      cookie = rewardCookie.split(";")[0];
    }
    return { response, data: response.status === 204 ? null : await response.json() };
  };
}

const home = await get("/");
assert.equal(home.status, 200, "home SSR shell");
const html = (await home.text()).replace(/<!--.*?-->/gs, "");
for (const text of ["WattHabit", "Demo · SE4", "Shifting changes when you use energy, not how much", "rewards", "radar"]) {
  assert.ok(html.toLowerCase().includes(text.toLowerCase()), `home missing ${text}`);
}

const now = new Date();
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
const priceResponse = await get(`/api/prices?region=SE4&date=${date}`);
assert.equal(priceResponse.status, 200);
const prices = await priceResponse.json();
assert.ok(["live", "cached", "unavailable"].includes(prices.status), `unexpected source status ${prices.status}`);
assert.equal(prices.region, "SE4");
assert.ok(Array.isArray(prices.intervals));
assert.ok(prices.sourceUrl.startsWith("https://"));
if (prices.status === "live") assert.ok(prices.intervals.length > 0, "live price response must contain intervals");
if (prices.status === "cached") assert.ok(prices.intervals.length > 0, "cached price response must contain intervals");
const demoPrices = await get(`/api/prices?region=SE4&date=${date}&demo=1`);
assert.equal(demoPrices.status, 200);
assert.equal((await demoPrices.json()).status, "demo");
for (const query of ["region=XX", "date=2026-99-99", "demo=yes"]) {
  assert.equal((await get(`/api/prices?${query}`)).status, 400, `invalid prices query ${query}`);
}

const radarResponse = await get("/api/opportunities?region=SE4");
assert.equal(radarResponse.status, 200);
const radar = await radarResponse.json();
assert.ok(radar.opportunities.length > 0, "radar has sourced entries");
assert.ok(radar.opportunities.every((item) => item.verified && !item.demo && item.sourceUrl.startsWith("https://")));
assert.equal((await get("/api/opportunities?region=XX")).status, 400);

const call = browser();
const wallet = "/api/rewards";
const complete = "/api/challenges/complete";
const redeem = "/api/rewards/redeem";
const voucher = { voucherId: "demo-coffee", code: "DEMO-COFFEE" };
assert.deepEqual((await call(wallet)).data, { points: 3, progress: 3, goal: 5, vouchers: [] });
assert.deepEqual((await call(redeem, voucher)).data, { status: "invalid", demo: true });
assert.deepEqual((await call(complete, { challengeId: "plan-laundry" })).data, { progress: 4, goal: 5, rewardUnlocked: false, demo: true });
assert.deepEqual((await call(complete, { challengeId: "plan-laundry" })).data, { progress: 4, goal: 5, rewardUnlocked: false, demo: true });
assert.deepEqual((await call(complete, { challengeId: "plan-dishwasher" })).data, { progress: 5, goal: 5, rewardUnlocked: true, demo: true });
const unlocked = (await call(wallet)).data;
assert.equal(unlocked.points, 5);
assert.equal(unlocked.vouchers.length, 1);
assert.match(unlocked.vouchers[0].title, /DEMO — NOT REDEEMABLE/);
assert.equal(unlocked.vouchers[0].isRedeemed, false);
assert.deepEqual((await call(redeem, voucher)).data, { status: "redeemed", demo: true });
assert.deepEqual((await call(redeem, voucher)).data, { status: "already_redeemed", demo: true });
assert.equal((await call(wallet)).data.vouchers[0].isRedeemed, true);
const other = browser();
assert.equal((await other(wallet)).data.points, 3, "wallet cookie isolates browsers");
assert.deepEqual((await other(redeem, voucher)).data, { status: "invalid", demo: true });

let coachStatus = "skipped";
if (liveCoach) {
  const coach = await get("/api/coach", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region: "SE4", housing: "included", activities: ["laundry"], availableAfter: null, priceSummary: null, message: "Can I save kWh by moving laundry?" }),
  });
  assert.equal(coach.status, 200);
  const answer = await coach.json();
  assert.ok(["groq", "fallback"].includes(answer.source));
  assert.equal(typeof answer.reply, "string");
  assert.equal(typeof answer.disclaimer, "string");
  assert.ok(answer.reply.length > 20);
  assert.ok(answer.quest === null || answer.quest.estimatedImpact === null);
  assert.ok(answer.source === "groq" ? typeof answer.model === "string" : answer.model === null);
  coachStatus = `${answer.source}${answer.model ? ` (${answer.model})` : ""}`;
}
console.log(`PASS: ${base.origin}; SSR, prices=${prices.status}, demo fixture, invalid inputs, sourced radar=${radar.opportunities.length}, isolated rewards/unlock/redeem, coach=${coachStatus}.`);
