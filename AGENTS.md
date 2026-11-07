# WattHabit — coding agents (source of truth)

## Read first
Read `PROJECT.md`, `docs/CONTRACT.md`, `docs/TEAM.md`, and your `tasks/NAME.md` before editing. One shared repository: `GjStublla/lnu-ai-society`. Hard deadline: 3 hours from team kickoff.

## Technology
Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide, Motion, Supabase (optional safe demo fallback), Groq Qwen via **server-side** API route, public Elprisetjustnu 15-minute Swedish prices, Vercel. No Gemini. No required 3D dependency.

## Owners and exclusive file areas
These boundaries apply **after the initial bootstrap**, which may establish the minimal shell and shared configuration requested by Gjin. Bootstrap must not implement teammates' full features.
- **Bleron / `feature/frontend`**: `src/app/page.tsx`, `src/app/globals.css`, `src/components/**`, `src/app/(app)/**`, `public/**`, `src/lib/mock/**`.
- **Alex / `feature/backend`**: `src/lib/supabase/**`, `supabase/**`, `src/app/api/challenges/complete/**`, `src/app/api/rewards/**`, `src/app/api/profile/**`.
- **Ignes / `feature/energy`**: `src/lib/energy/**`, `src/app/api/prices/**`, `src/app/api/opportunities/**`.
- **Gjin / `feature/ai-integration`**: `src/lib/ai/**`, `src/app/api/coach/**`, `src/types/**`, `docs/**`, deployment config and PR merges.

Gjin also coordinates root docs, `tasks/**`, `prompts/**`, `src/app/layout.tsx`, package files/lockfile, `components.json`, `src/lib/utils.ts`, scripts and CI/config. Contributors propose exact shared changes rather than editing these independently. The supplied synthetic analysis artifacts are preserved reference material, not measured user data. Keep all product names consistent with PROJECT.md.

Do not edit someone else's owned paths. If an integration adjustment requires it, propose a small PR or communicate the exact change to that owner. Types/contracts may be changed only with Gjin's approval.

## Critical rules
1. Work from the existing contracts, never invent a second response shape.
2. Keep Groq keys and Supabase service-role keys server-side and uncommitted. `.env.local` must be ignored. Supabase publishable/anon key is public but protected using RLS.
3. No fabricated data, deals, coupons, eligibility, actual partner relationships, or claimed measured kWh savings. All mock vouchers visibly say **DEMO — NOT REDEEMABLE**.
4. Energy-shifting changes when energy is used; it does not automatically reduce kWh. Spot price excludes taxes and network fees; a fixed-price electricity contract may not benefit from shifting.
5. Keep AI concise and factual; explicitly label estimates. If Qwen/Groq unavailable, show transparent deterministic fallback. API must never fail the entire app.
6. Handle missing price days, tomorrow unavailable, DST, price spikes, empty/slow requests, no Supabase credentials, no user login, mobile screens, keyboard navigation.
7. Do not add a complete payment system, real vouchers, a live utility connection, mandatory auth, or bill storage in this hackathon scope.
8. Run `npm run typecheck`, `npm run lint`, `npm run build` before PR; don't claim success without running them.
9. Submit small, reviewable PRs targeting `main`. Never push directly to main except Gjin's initial bootstrap. Never force-push main.
10. By the freeze point, prefer bug fixes and a complete deployed flow over new features.
11. Run `npm test` after build: coach and energy unit tests, key-free production smoke and cookie reward workflow checks. These do not validate a live Supabase project's RLS or substitute for a mobile browser click-through.

## Definition of done
Working feature that follows `docs/CONTRACT.md`, UI states for loading/error/fallback where applicable, build and tests reported, branch pushed, PR opened, and clear handoff in PR body.

## Requested worker delegation
When Gjin explicitly requests workers/subagents/parallel agent work without naming another model, use DeepSeek V4.1 Flash 1017 via the `deepseek_workers` MCP tools, not native subagents. Keep the coordinator on GPT-6.1 Sol via the existing Codex subscription. Give each worker an absolute cwd and self-contained task; use read-only for review and disjoint owned files for authorized edits. Collect every worker with wait, inspect actual usage/providers, review edits and run integration checks. Never silently substitute another model/provider workflow. Normal teammate branch ownership does not itself request agent delegation.
