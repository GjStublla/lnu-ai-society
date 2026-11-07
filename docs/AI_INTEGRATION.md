# Gjin's coach handoff

`POST /api/coach` implements the existing `CoachRequest` / `CoachResponse` contract and is connected to Bleron's coach sheet. It works without Groq or Supabase. Response shapes are unchanged.

## What this slice does
- Validates a bounded JSON request: 8 KB total, message 1–1200 trimmed characters, region/housing enums, up to three unique laundry/dishwasher/charging activities and Stockholm `HH:mm` availability or null. Missing `priceSummary` normalizes to null; explicit null is accepted.
- Validates optional summary timestamps and text, then **discards the entire client summary**. A server-only adapter loads today's/tomorrow's normalized prices, checks source, region, date, units, freshness and real-data status, and uses the shared window engine. Only verified live/cached windows can ground numerical price guidance; demo prices cannot.
- With a private key, calls Groq with the preferred configurable Qwen model. Groq selects a reviewed guidance topic using strict JSON schema. The server builds all visible prose, quest IDs, evidence URLs and impacts from its reviewed catalog. It never publishes free-form provider prose, numbers, links, offers or reward operations.
- This is **AI-selected reviewed guidance**, not unrestricted generative chat. State that honestly. Region, billing, activity and availability personalize the response; the user question guides topic selection. All modeled impacts are null until a supported calculation and assumptions are added.
- Returns `source:'groq'` and the successful model ID only after a valid provider selection. Otherwise returns `source:'fallback', model:null` with a visible written-fallback disclaimer. HTTP 200 for either; malformed/invalid/oversized/slow input returns HTTP 400 `{error:string}`. Next handles unsupported methods with 405.
- Uses a 1.5-second body-read deadline, a separate 1.5-second price-context lookup deadline, at most two model attempts of up to 3 seconds inside a 6.5-second provider budget, a 16 KB provider response limit and a 512-token completion cap per attempt. No retries on 401/429; model-specific/unavailable/invalid-output failures may try the configured alternate once. No background retry loop. A timed-out price lookup stops waiting; its shared upstream fetch retains the energy service's six-second timeout.
- Propagates client cancellation through body reads and provider calls. An already-aborted request makes no provider call; a disconnect during the primary attempt prevents the alternate attempt.
- Sets `Cache-Control: no-store`; logs no user messages, provider bodies or keys. Never calls a provider at import/build time. The route has no completion/reward/DB side effects.

## Bleron's typed fetch
Use the existing shared types; no duplicate interface or client-side key. Render the returned `reply`, optional quest and `disclaimer`, and clearly label `source:'fallback'` as written guidance. A Groq result means AI selected reviewed guidance. Any attached numerical price window is independently calculated and verified by the server, with its source/status/update time disclosed. A 400 error is a form error, not a success response.

```ts
import type { CoachRequest, CoachResponse, ApiErrorResponse } from '@/types/contracts';

const body: CoachRequest = {
  region: 'SE4',
  housing: 'included',
  activities: ['laundry'],
  availableAfter: '18:00',
  priceSummary: null,
  message: 'Does moving laundry reduce kWh?',
};
const response = await fetch('/api/coach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!response.ok) {
  const problem = await response.json() as ApiErrorResponse;
  throw new Error(problem.error);
}
const guidance = await response.json() as CoachResponse;
// Render reply, disclaimer and optional quest; also catch network errors in the UI.
```

The UI uses a 12-second request timeout and handles network failure without leaving a spinner. Always pass `priceSummary:null`; client summaries cannot ground the coach.

## Alex's quest integration
This coach returns stable **participation-planning** IDs: `plan-laundry`, `plan-dishwasher`, `plan-charging`, or educational `learn-spot-prices`. Alex must explicitly approve/allowlist supported IDs before wiring completion; the coach cannot mint points or vouchers. Rewards/safety/out-of-scope topics can return `quest:null`. Evidence links point to public price documentation, not a merchant. `estimatedImpact` is always null.

## Price integration
`price-context.ts` calls Ignes's loader directly, with no internal HTTP request or request-Host trust. `context.ts` derives a complete 60-minute charging or 120-minute laundry/dishwasher window after now and the user's Stockholm availability. It compares the window average with the earliest eligible start on that same day. Today is preferred when the difference is at least 0.05 SEK/kWh, otherwise a useful tomorrow window is considered. All numerical facts and evidence URLs are server-owned. Missing/stale/demo prices produce guidance without price claims. No measured consumption or numeric impact is asserted.

## Gjin's private setup
1. If `.env.local` does not exist, copy `.env.example` to `.env.local`. It is ignored; never put a key in a `NEXT_PUBLIC_*` variable or chat.
2. Create your Groq key privately and set `GROQ_API_KEY`. Defaults remain `GROQ_MODEL=qwen/qwen3.8-27b` and `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b`. Model overrides must support strict JSON schema; failures keep the fallback usable.
3. Run `npm run check:groq`. This makes only an authenticated, bounded **GET models** request and prints whether the configured IDs are listed. It does not generate text or prove generation permissions/quota. With no key it exits nonzero with a setup instruction and sends no request.
4. Check account/project permissions, rate limits and spending controls in the Groq console. The public demo route is unauthenticated; per-request caps are not a global spending cap or durable distributed rate limit. Keep the key absent on public production until account controls and intended access are set.
5. Restart dev after editing local env; add the same private variables to the intended Vercel environments and redeploy manually after merging. Verify an actual `source:'groq'` response if live AI is intended. No live account access or provider completion was verified during key-free implementation.

Supabase is not required by this route. Invitations, Vercel setup/deployment and Alex's reviewed migrations remain Gjin's manual/team tasks. Never mark the whole integrated judge demo complete from this coach PR alone.

## Verification
```bash
npm run typecheck
npm run lint
npm run build
npm test
```

`test:coach` uses native Node tests (Node >=22.18, recommended 24) and mocks only the external HTTP boundary. It covers missing/blank key, all billing states, exact response keys, input validation, null/omitted summaries, forged summaries, prompt injection, primary/alternate selection, 401/429/5xx/network failures, invalid/extra/truncated/mismatched output, byte limits, UTF-8 and real deadlines. `test:smoke` starts a real built Next server and checks the key-free coach, 400 JSON validation and 405 method handling as well as the shell. Explicit blank service variables prevent local env secrets from being reloaded during smoke tests. No tests make paid model calls.

The server-only imports block accidental use from client components. Native tests use the `react-server` condition to exercise those same modules outside Next; keep them server-side in the app.
