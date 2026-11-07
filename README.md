# WattHabit — setup and team handoff

**WattHabit — Small habits. Real rewards.** A student energy-habit and rewards app. Coffee cup fill is one progress treatment; rewards can extend to student discounts and events.

The starter is a runnable Next.js App Router shell with TypeScript, Tailwind, shadcn/ui primitives, Lucide, Motion and canonical API types. It works without API keys, login, Supabase or network data. Gjin's `/api/coach` now supplies validated, sourced guidance with Groq topic selection when configured and transparent written fallback otherwise; [AI integration handoff](docs/AI_INTEGRATION.md) explains the boundaries and setup. The shell remains Bleron's preview until he connects it. Live price/reward APIs, saved progress and onboarding remain their owners' work.

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
Open http://localhost:3000. No environment file is necessary for the shell. When implementing integrations, copy `.env.example` to `.env.local` and fill values privately; PowerShell: `Copy-Item .env.example .env.local`. Never commit that file.

## Checks
```bash
npm run typecheck
npm run lint
npm run build
npm test
```
`npm test` runs coach unit/HTTP-handler tests and the production smoke check. Build first. `npm run test:coach` runs just feature tests; `npm run test:smoke` starts an isolated built server and checks key-free rendering, navigation, assets and the coach's fallback/error contract, then stops it. No provider calls are made by tests. CI runs these commands on main and PRs. Use `npm start` to serve a built app yourself. Recommended Node 24; native feature tests require Node >=22.18.

## Team start
Accept Gjin's GitHub invitation, clone, run `npm ci`, then switch to your assigned prepared branch. Bleron's `feature/frontend`, Alex's `feature/backend` and Ignes's `feature/energy` are prepared from the bootstrap on Gjin's request. Gjin creates his own `feature/ai-integration` when starting AI work. Exact commands and prompt paths: [docs/TEAM.md](docs/TEAM.md). Gjin coordinates dependency/lockfile, layout and contract changes.

| Owner | Branch | Prompt |
| --- | --- | --- |
| Bleron | `feature/frontend` | [Frontend prompt](prompts/BLERON_CODEX_PROMPT.md) |
| Alex | `feature/backend` | [Backend prompt](prompts/ALEX_CODEX_PROMPT.md) |
| Ignes | `feature/energy` | [Energy prompt](prompts/IGNES_CODEX_PROMPT.md) |
| Gjin | `feature/ai-integration` | [AI/integration prompt](prompts/GJIN_CODEX_PROMPT.md) |

## Frontend foundation
`src/app/page.tsx` and `globals.css` are deliberately small starting points for Bleron. `components.json`, `src/lib/utils.ts` and `src/components/ui/` provide the standard shadcn foundation. Button, Card and Badge are supplied; Gjin coordinates further CLI additions and dependency updates. No remote fonts or images are needed at build time. Motion is installed for the later cup interaction, not required to render the shell.

Gjin can add the remaining optional primitives non-interactively with `npx shadcn add dialog tabs sheet --yes` (uses the locally pinned CLI). Initialization is already complete; do not run init again. Keep the cream/espresso/green tokens and request owner review for generated UI changes.

## Existing analysis assets
The pre-existing `data_raw/`, `data_cleaned/`, `charts/` and Python analysis scripts are preserved. The participant dataset is explicitly synthetic; see its README and DATA_DICTIONARY. These artifacts do not drive the starter and must never be shown as live student meter readings or verified impact. Python analytics are separate from the npm app; no Python dependencies are needed for app checks.

## Service setup remains manual
Gjin invites collaborators and imports this repository into Vercel, using Node 24 and `main`. Alex supplies Supabase setup/migrations in his PR. Gjin privately adds Groq and optional Supabase variables after those features merge. See [docs/VERCEL.md](docs/VERCEL.md). No external services, accounts or deployment are configured by bootstrap.

## Repo
https://github.com/GjStublla/lnu-ai-society

## Honesty
Energy observations are not real-user measurements. All reward codes and premium offers in the demo must be clearly labeled and non-redeemable.
