# WattHabit — setup and team handoff

**WattHabit — Small habits. Real rewards.** A student energy-habit and rewards app. Coffee cup fill is one progress treatment; rewards can extend to student discounts and events.

The integrated demo uses Next.js App Router, TypeScript, Tailwind, shadcn/ui, Lucide and Motion. Onboarding, region-specific prices, a continuous price-window quest, AI-selected reviewed guidance, animated cup progress, demo wallet and sourced Radar are connected. It works without keys, login or Supabase using explicit fallbacks. [AI integration](docs/AI_INTEGRATION.md) describes the server-grounded coach; [demo checklist](docs/DEMO_CHECKLIST.md) records tested workflows and the presentation path.

- Project: `PROJECT.md`
- Agent rules: `AGENTS.md`
- Shared API contracts: `docs/CONTRACT.md` and `src/types/contracts.ts`
- Team commands: `docs/TEAM.md`
- Deployment: `docs/VERCEL.md`
- Bootstrap scope, file inventory and actual checks: [docs/BOOTSTRAP.md](docs/BOOTSTRAP.md)
- Each person's task: `tasks/NAME.md`
- Each person's AI agent prompt: `prompts/NAME_CODEX_PROMPT.md`

## Run locally (Node 24 LTS recommended)
```bash
npm ci
npm run dev
```
Open http://localhost:3000. No environment file is required. If `.env.local` does not exist, copy `.env.example` there and fill values privately. Never overwrite an existing local environment file or commit it.

## Checks
```bash
npm run typecheck
npm run lint
npm run build
npm test
```
`npm test` runs 25 coach tests, 33 energy tests, an offline production smoke check and the cookie-based reward flow (validation, repeat completion, unlock, repeat redemption and browser isolation). Build first. CI runs the same checks on main and PRs. Tests use no paid model calls. `npm start` serves a built app. Recommended Node 24; native feature tests require Node >=22.18.

Deployment acceptance: `node scripts/demo-workflows.mjs --url https://lnu-ai-society.vercel.app`. Add `--live-coach` for one real coach request, which may use Groq quota; missing quota/key still yields labeled fallback. This script verifies HTTP workflows, not visual interactions.

## Team start
Accept Gjin's GitHub invitation, clone, run `npm ci`, then switch to your assigned prepared branch. Bleron's `feature/frontend`, Alex's `feature/backend` and Ignes's `feature/energy` are prepared from the bootstrap on Gjin's request. Gjin creates his own `feature/ai-integration` when starting AI work. Exact commands and prompt paths: [docs/TEAM.md](docs/TEAM.md). Gjin coordinates dependency/lockfile, layout and contract changes.

| Owner | Branch | Prompt |
| --- | --- | --- |
| Bleron | `feature/frontend` | [Frontend prompt](prompts/BLERON_CODEX_PROMPT.md) |
| Alex | `feature/backend` | [Backend prompt](prompts/ALEX_CODEX_PROMPT.md) |
| Ignes | `feature/energy` | [Energy prompt](prompts/IGNES_CODEX_PROMPT.md) |
| Gjin | `feature/ai-integration` | [AI/integration prompt](prompts/GJIN_CODEX_PROMPT.md) |

## Frontend foundation
`src/app/page.tsx` mounts Bleron's mobile-first interface in `src/components/watthabit/`. Warm cream/espresso/green tokens, accessible controls and reduced-motion support preserve the WattHabit direction. The SVG cup represents participation progress. Price planning delegates to the same DST-safe engine used by server coach context. No remote fonts or images are required at build time.

Gjin can add the remaining optional primitives non-interactively with `npx shadcn add dialog tabs sheet --yes` (uses the locally pinned CLI). Initialization is already complete; do not run init again. Keep the cream/espresso/green tokens and request owner review for generated UI changes.

## Existing analysis assets
The pre-existing `data_raw/`, `data_cleaned/`, `charts/` and Python analysis scripts are preserved. The participant dataset is explicitly synthetic; see its README and DATA_DICTIONARY. These artifacts do not drive the starter and must never be shown as live student meter readings or verified impact. Python analytics are separate from the npm app; no Python dependencies are needed for app checks.

## Services
The existing Vercel project follows `main`; [deployment setup](docs/VERCEL.md) lists private variables. The public price API needs no key. Groq stays server-side and always has a deterministic fallback. Supabase is optional: its migrations/authentication are not required for this no-login demo and must be validated separately before use. No real voucher, partner deal, payment or push notification is implemented.

## Repo
https://github.com/GjStublla/lnu-ai-society

## Honesty
Energy observations are not real-user measurements. All reward codes and premium offers in the demo must be clearly labeled and non-redeemable.
