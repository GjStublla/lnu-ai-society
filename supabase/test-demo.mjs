// Run after npm run build. The production server is isolated to an ephemeral local port.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const { port } = listener.address();
await new Promise((resolve) => listener.close(resolve));

const env = { ...process.env, NODE_ENV: "production" };
for (const name of ["GROQ_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) env[name] = "";
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
], { env, stdio: ["ignore", "pipe", "pipe"] });
const base = `http://127.0.0.1:${port}`;
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });

function browser() {
  let cookie;
  return async (path, body, { status = 200, raw = false } = {}) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: raw ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, status, path);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    const nextCookie = response.headers.getSetCookie().find((value) => value.startsWith("watthabit_demo_rewards="));
    if (nextCookie) {
      assert.match(nextCookie, /; HttpOnly/i);
      assert.match(nextCookie, /; SameSite=lax/i);
      cookie = nextCookie.split(";")[0];
    }
    return response.json();
  };
}

try {
  let ready = false;
  const deadline = Date.now() + 20_000;
  while (!ready && Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(base + "/api/rewards", { signal: AbortSignal.timeout(1_500) });
      ready = response.ok;
      await response.body?.cancel();
    } catch {
      // Next.js is still starting.
    }
    if (!ready) await delay(200);
  }
  assert.ok(ready, "Production API did not start");

  const wrongMethod = await fetch(base + "/api/challenges/complete", { signal: AbortSignal.timeout(5_000) });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "POST, OPTIONS");
  assert.deepEqual(await wrongMethod.json(), { error: "Method not allowed." });

  const options = await fetch(base + "/api/rewards", {
    method: "OPTIONS", signal: AbortSignal.timeout(5_000),
  });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("allow"), "GET, HEAD, OPTIONS");

  const call = browser();
  const complete = "/api/challenges/complete";
  const redeem = "/api/rewards/redeem";
  const voucher = { voucherId: "demo-coffee", code: "DEMO-COFFEE" };
  const invalid = { status: "invalid", demo: true };

  assert.deepEqual(await call("/api/rewards"), { points: 3, progress: 3, goal: 5, vouchers: [] });
  assert.deepEqual(await call(redeem, voucher), invalid);
  for (const input of [{ challengeId: "arbitrary-points" }, { challengeId: "plan-laundry", points: 500 }]) {
    assert.equal(typeof (await call(complete, input, { status: 400 })).error, "string");
  }
  assert.equal(typeof (await call(complete, "{", { status: 400, raw: true })).error, "string");
  assert.equal(typeof (await call(complete, " ".repeat(2_049), { status: 400, raw: true })).error, "string");

  const first = { progress: 4, goal: 5, rewardUnlocked: false, demo: true };
  assert.deepEqual(await call(complete, { challengeId: "plan-laundry" }), first);
  assert.deepEqual(await call(complete, { challengeId: "plan-laundry" }), first);
  assert.deepEqual(await call(complete, { challengeId: "plan-dishwasher" }), {
    progress: 5, goal: 5, rewardUnlocked: true, demo: true,
  });
  const wallet = await call("/api/rewards");
  assert.equal(wallet.points, 5);
  assert.equal(wallet.vouchers.length, 1);
  assert.match(wallet.vouchers[0].title, /DEMO — NOT REDEEMABLE/);
  assert.equal(wallet.vouchers[0].isRedeemed, false);
  assert.deepEqual(await call(redeem, { ...voucher, code: "wrong" }), invalid);
  assert.deepEqual(await call(redeem, voucher), { status: "redeemed", demo: true });
  assert.deepEqual(await call(redeem, voucher), { status: "already_redeemed", demo: true });
  assert.equal((await call("/api/rewards")).vouchers[0].isRedeemed, true);

  const otherBrowser = browser();
  assert.equal((await otherBrowser("/api/rewards")).points, 3);
  assert.deepEqual(await otherBrowser(redeem, voucher), invalid);
  console.log("PASS: demo validation, repeat completion, unlock, repeat redemption, and browser isolation.");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (server.exitCode === null) {
    const closed = once(server, "exit");
    server.kill();
    await closed;
  }
}
