// Explicit, read-only setup check. Never generates a completion or prints credentials/provider bodies.
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { configuredModels } from "../src/lib/ai/coach.ts";
import { readBoundedJson, withDeadline } from "../src/lib/ai/transport.ts";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const key = process.env.GROQ_API_KEY?.trim();
if (!key) {
  console.log("GROQ_API_KEY is not set. Add it privately in ignored .env.local; the coach currently uses written fallback guidance.");
  process.exitCode = 1;
} else {
  try {
    const data = await withDeadline(5000, async (signal) => {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal,
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error();
      }
      return readBoundedJson(response, 65_536, signal);
    });
    if (!data || typeof data !== "object" || !("data" in data) || !Array.isArray(data.data)) throw new Error();
    const listed = new Set(data.data.flatMap((item) => item && typeof item === "object" && typeof item.id === "string" ? [item.id] : []));
    for (const model of configuredModels(process.env)) {
      const found = listed.has(model);
      console.log(`${model}: ${found ? "listed" : "not listed"}`);
      if (!found) process.exitCode = 1;
    }
    console.log("Authenticated model listing only. Generation permissions, quota and a live coach reply are not verified by this check.");
  } catch {
    console.error("Groq model check failed or timed out. Check the key, account permissions and connection privately; no provider details were printed.");
    process.exitCode = 1;
  }
}
