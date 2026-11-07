# Gjin — Technical Lead, Groq/Qwen AI & Vercel Integration

**Branch:** `feature/ai-integration` | **Mission:** Make the coach truly helpful, integrate the team's work, and deliver a reliable public live URL.

## You own
`src/lib/ai/**`, `src/app/api/coach/**`, `src/types/**`, `AGENTS.md`, `PROJECT.md`, `docs/**`, deployment configuration, code review and releases. Do not rewrite Bleron's UI, Alex's DB or Ignes's prices without owner coordination.

## Must deliver (20–70 minutes; 50-minute first slice)
The repository bootstrap is already complete. Start the feature branch from main; do not repeat scaffolding. Preserve shared response shapes. You coordinate root files, package/lockfile, layout, shared utils, scripts, tasks/prompts and CI as well as the paths above.
1. Implement `POST /api/coach` via server-only Groq SDK or OpenAI-compatible HTTP. Preferred model env `qwen/qwen3.8-27b`; fallback model `openai/gpt-oss-20b`. Check exact available models via Groq console. Free tier is limited; not guaranteed unlimited. Use short outputs and request/token caps.
2. Strict request validation (Zod) and server-side system prompt. Only accept trusted verified price summaries and profile data; don't invent kWh savings, personal usage, discounts, verified offers, medical/safety advice, or exclusive promotions. The model is a concise, friendly **barista coach**, not a chatty children's pet.
3. Require response shape from `docs/CONTRACT.md`; parse and validate model output, with deterministic fallback when no key, timeout, invalid JSON, provider 429, or unsupported model. Never expose `GROQ_API_KEY` to browser.
4. Merge a first slice from Bleron + Ignes + Alex as PRs pass; test end-to-end sequence. Coordinate all contract edits, avoid pushing over teammate changes.
5. Manually connect GitHub repo to Vercel; set private env vars in Vercel, deploy early, check phone and API responses after every merge. Share live URL with team.
6. Run final happy-path, no-Groq, no-Supabase, missing price, and duplicate reward tests; keep demo credible. Prepare 3-minute pitch and source-backed annual modeled-impact slide.

Treat client `priceSummary` as untrusted: obtain verified prices on the server or ignore it. Validate bounded inputs/model output. Implement no bill storage, payment, mandatory auth or real voucher issuance. Groq public listing was checked during bootstrap; account access is still unverified. Use server-side REST if preferred; no SDK is necessary. Gjin personally handles invitations and Vercel; an agent prepares instructions unless Gjin explicitly requests deployment automation.

## Acceptance and PR
Run `npm run typecheck`, `npm run lint`, `npm run build`, then `npm test`. Independently test no key, timeout, provider 429/unsupported model, invalid output/body and malicious client summaries. Push `feature/ai-integration` normally and open a PR to main with checks, actual model/fallback status and integration notes. Do not mark deployment complete without observing its public URL.

## Integration rhythm
- 0-20 minutes: bootstrap docs/contract pushed and Vercel shell online.
- 20-70: Groq + test scripts. Communicate any integration blockers immediately.
- 70-110: merge first endpoints and UI, ensure complete journey.
- 110-150: mobile polish, fallback, and PR review.
- 150-180: release freeze, no speculative extra features, final production URL and backup demo.

## Handoff
Main output is the publicly accessible Vercel URL, green CI/build, explicit distinction of live vs demo states, and team PRs merged into `main`.
