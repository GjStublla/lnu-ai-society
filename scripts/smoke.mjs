// Production HTTP smoke test. Run `npm run build` first; no live services required.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const { port } = listener.address();
await new Promise((resolve) => listener.close(resolve));

const env = { ...process.env, NODE_ENV: "production" };
// Explicit blanks prevent Next from reloading local secrets out of .env.local during this test.
for (const name of ["GROQ_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) env[name] = "";
const server = spawn(process.execPath, ["--import", "./scripts/offline-services.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
let launchError;
server.on("error", (error) => { launchError = error; });
const base = `http://127.0.0.1:${port}`;

try {
  let response;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (server.exitCode !== null) throw new Error(`Production server exited: ${logs}`);
    try { response = await fetch(base, { signal: AbortSignal.timeout(1500) }); } catch { /* Wait for startup. */ }
    if (response) break;
    await delay(200);
  }
  assert.ok(response, "Production server must become ready within 20 seconds");
  assert.equal(response.status, 200, "Home must render without service credentials");
  const html = (await response.text()).replace(/<!--.*?-->/gs, "");
  assert.match(html, /WattHabit/);
  assert.match(html, /Demo · SE4/);
  assert.match(html, /Shifting changes when you use energy, not how many kWh/);
  assert.match(html, /Estimates \(est\.\) are modeled with stated assumptions/);
  assert.match(html, /3 example stamps · demo progress/);
  assert.match(html, /No verified offers right now|Savings Radar/);
  for (const target of ["home", "challenges", "rewards", "radar"]) {
    assert.ok(html.includes(`id="${target}"`), `Missing navigation destination: ${target}`);
    assert.ok(html.includes(`href="#${target}"`), `Missing navigation link: ${target}`);
  }
  const stylesheet = html.match(/href="([^"]+\.css(?:\?[^"]*)?)"/);
  assert.ok(stylesheet, "Home must link its production stylesheet");
  const css = await fetch(new URL(stylesheet[1], base), { signal: AbortSignal.timeout(5000) });
  assert.equal(css.status, 200, "Production stylesheet must load");
  const icon = await fetch(`${base}/icon.svg`, { signal: AbortSignal.timeout(5000) });
  assert.equal(icon.status, 200, "App icon must load");
  const coach = await fetch(`${base}/api/coach`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region: "SE4", housing: "included", activities: ["laundry"], availableAfter: null, priceSummary: null, message: "Can I save kWh by moving laundry?" }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(coach.status, 200, "Coach must work without a key");
  assert.equal(coach.headers.get("cache-control"), "no-store");
  const guidance = await coach.json();
  assert.equal(guidance.source, "fallback");
  assert.equal(guidance.model, null);
  assert.equal(guidance.quest.estimatedImpact, null);
  assert.equal(typeof guidance.reply, "string");
  assert.ok(guidance.reply.length > 20);
  const invalid = await fetch(`${base}/api/coach`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{", signal: AbortSignal.timeout(5000),
  });
  assert.equal(invalid.status, 400, "Malformed JSON must return validation error");
  assert.deepEqual(Object.keys(await invalid.json()), ["error"]);
  const wrongMethod = await fetch(`${base}/api/coach`, { signal: AbortSignal.timeout(5000) });
  assert.equal(wrongMethod.status, 405);
  const prices = await fetch(`${base}/api/prices?region=SE4&date=2026-11-07`, { signal: AbortSignal.timeout(5000) });
  assert.equal(prices.status, 200);
  assert.equal(prices.headers.get("cache-control"), "no-store");
  const priceData = await prices.json();
  assert.ok(["unavailable", "cached"].includes(priceData.status));
  assert.equal(priceData.region, "SE4");
  const fixture = await fetch(`${base}/api/prices?region=SE4&date=2026-11-07&demo=1`);
  assert.equal((await fixture.json()).status, "demo");
  for (const suffix of ["region=XX", "date=not-a-date", "demo=true"]) {
    const bad = await fetch(`${base}/api/prices?${suffix}`);
    assert.equal(bad.status, 400, suffix);
  }
  const opportunities = await fetch(`${base}/api/opportunities?region=SE4`);
  assert.equal(opportunities.status, 200);
  const radar = await opportunities.json();
  assert.ok(radar.opportunities.length >= 1);
  assert.ok(radar.opportunities.every((item) => item.verified === true && item.demo === false && item.sourceUrl.startsWith("https://")));
  assert.equal((await fetch(`${base}/api/opportunities?region=XX`)).status, 400);
  console.log("PASS: key-free production shell and coach, fallback/validation/method contracts, navigation and assets.");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  const closed = once(server, "exit");
  if (server.exitCode === null) {
    server.kill();
    await closed;
  }
}
