// Production shell smoke test. Run `npm run build` first; no live services required.
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
for (const name of ["GROQ_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) delete env[name];
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
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
  const html = await response.text();
  assert.match(html, /WattHabit/);
  assert.match(html, /DEMO — NOT REDEEMABLE/);
  assert.match(html, /Price feed not connected/);
  assert.match(html, /No subscription or payment is available/);
  for (const target of ["home", "main", "challenges", "rewards", "radar"]) {
    assert.ok(html.includes(`id="${target}"`), `Missing navigation destination: ${target}`);
    assert.ok(html.includes(`href="#${target}"`), `Missing navigation link: ${target}`);
  }
  const stylesheet = html.match(/href="([^"]+\.css(?:\?[^"]*)?)"/);
  assert.ok(stylesheet, "Home must link its production stylesheet");
  const css = await fetch(new URL(stylesheet[1], base), { signal: AbortSignal.timeout(5000) });
  assert.equal(css.status, 200, "Production stylesheet must load");
  const icon = await fetch(`${base}/icon.svg`, { signal: AbortSignal.timeout(5000) });
  assert.equal(icon.status, 200, "App icon must load");
  console.log("PASS: key-free production home, demo disclosures, navigation, CSS and icon.");
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
