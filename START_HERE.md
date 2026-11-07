# Start here — 4-person WattHabit build

## The repository starter is ready
1. Gjin manually invites Bleron, Alex and Ignes through GitHub Settings -> Collaborators. Invitations must be accepted before they can push.
2. Follow the exact clone/install/branch commands in `docs/TEAM.md`. Bleron, Alex and Ignes switch to their prepared remote branches. Use Node 24 and npm. Do not re-scaffold or run the archived setup prompt again.
3. Read `AGENTS.md`, `PROJECT.md`, `docs/CONTRACT.md`, `docs/TEAM.md` and your `tasks/NAME.md`.
4. Paste the corresponding `prompts/NAME_CODEX_PROMPT.md` into your coding agent. Stay in your owned files; shared changes go through Gjin.
5. Run typecheck, lint, build, then `npm test`; push your branch and open a small PR targeting main. No direct main pushes after bootstrap.
6. Gjin manually imports the one shared repo into Vercel, deploys the key-free shell early and adds optional service variables when features merge.

## What exists now
Key-free responsive shell, working section links, cup illustration, non-redeemable rewards example, shared API types, shadcn foundation, reproducible dependencies and CI/smoke check. No feature API routes, Supabase project, Groq account verification or deployment are configured yet. Existing synthetic analysis assets are preserved separately.

## Who does what
- Bleron: delightful consumer UI and cup animation (`feature/frontend`)
- Alex: Supabase/auth-safe demo, progress and mock reward APIs (`feature/backend`)
- Ignes: 15-minute price intelligence, relevant source-backed energy opportunities (`feature/energy`)
- Gjin: Groq Qwen coaching, integration, Vercel deployment (`feature/ai-integration`)

**Clock:** 0–20 bootstrap/manual first deploy, 20–70 parallel features, 70–110 integration, 110–150 polish, 150–180 freeze and pitch. Optimize for one complete judge journey.
