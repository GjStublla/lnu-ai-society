# MASTER PROMPT — Paste into Codex inside your local repository

> Retained bootstrap reference. Main is now initialized; team members should use their role prompts under `prompts/` instead of re-running scaffolding.

You are the lead bootstrap engineer for **WattHabit**, a 4-person LNU AI Society hackathon project. Your job in this run is **to initialize a clean, working, easily parallelized Next.js repository**, not to build the entire app alone.

## Repository and ownership
- Target GitHub repository: `https://github.com/GjStublla/lnu-ai-society.git` (owner: Gjin).
- The repository may be empty. Inspect `pwd`, `git status`, `git remote -v`, the current branch, and existing files before editing. Do not overwrite existing work, delete untracked files, reset history, force push, or change the remote.
- Use `main` as the shared starting branch. If the repository has no initial commit, initialize a normal `main` commit and make it pushable.
- Gjin will handle Vercel deployment and invitations to collaborators manually. Do not attempt external account creation or deploy, and do not ask for API keys in chat.
- Team: **Bleron** frontend (`feature/frontend`); **Alex** backend and Supabase (`feature/backend`); **Ignes** energy intelligence and opportunity radar (`feature/energy`); **Gjin** Groq/Qwen AI, integration, deployment (`feature/ai-integration`).

## Product: WattHabit
**Brand source of truth:** The name is WattHabit and the tagline is "Small habits. Real rewards." The cup-filling interaction is one example reward progress treatment, not the entire brand identity. Keep the app flexible for non-coffee rewards such as student discounts and events. Use only WattHabit in code, documentation, metadata, titles, and assets.
An adult-friendly, delightful mobile-first web app that helps Swedish students build energy-saving habits. It features a coffee cup that fills as students complete small challenges; free digital rewards; a **proposed** roughly $5/month tier for future, negotiated café/local perks; reminders based on real Swedish 15-minute spot prices; a conversational AI energy coach; a sourced opportunity/news radar; and optional future electricity-bill upload. This must NOT look like a generic analytics dashboard or a children's virtual-pet game.

Core judge demo: **onboarding -> live SE4 electricity-price event -> personalized quest / AI explanation -> cup fills -> clearly labeled DEMO voucher -> sourced opportunity card**. Present a mock premium plan but do not implement payment processing or claim actual partnerships.

The app must work without user meter connections, sensors, or logging each appliance. Completed quests measure participation, NOT verified electricity savings. Never claim shifting usage reduces kWh. Regional market spot prices exclude taxes, VAT, grid charges, and retailer margins and may not match the user's tariff.

## Stack (prefer established stable releases)
- Next.js App Router + TypeScript + Tailwind CSS, npm, `src/` layout.
- shadcn/ui (basic Button, Card, Badge, Dialog, Tabs, Sheet where helpful), Lucide icons, Motion for delightful micro-interactions. Use SVG/CSS animated coffee cup first; optional lazy-loaded Three.js stretch, NEVER a blocker.
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for Alex; safe demo fallback if credentials absent.
- Server-side Groq AI API (`groq-sdk` or their OpenAI-compatible REST API), **not Gemini**.
- Preferred `GROQ_MODEL=qwen/qwen3.8-27b`; `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b`. Qwen is a preview model, so check account model availability. Do not assume unlimited free use. API key must stay server-side. If no key/429/unavailable, return an explicitly labeled deterministic fallback so the demo still works.
- Free public prices from `https://www.elprisetjustnu.se/elpris-api`, target SE4 initially; dynamic date endpoint `/api/v1/prices/YYYY/MM-DD_SE4.json`. Swedish data is 15-minute from Oct 2025. Do not assume 96 intervals on daylight-saving transition days. Display timezone `Europe/Stockholm`. Handle tomorrow data not yet published.
- Vercel hosting to be configured by Gjin after push.

## Absolutely critical: contract-first parallel workflow
1. Create a **working, buildable starter app** on `main` with a branded placeholder landing page and useful navigation, **but do not fully implement the future owners' features**. The starter must render without API keys or Supabase configured.
2. Create project root `AGENTS.md`, `CLAUDE.md`, `PROJECT.md`, `.env.example`, `.gitignore`, `README.md`.
3. Create `docs/CONTRACT.md`, `docs/TEAM.md`, `docs/VERCEL.md`, `docs/DEMO_CHECKLIST.md`, `docs/SOURCES.md`.
4. Create `tasks/BLERON.md`, `tasks/ALEX.md`, `tasks/IGNES.md`, `tasks/GJIN.md` with precise file ownership, deliverables, acceptance checks, and 3-hour limits.
5. Create `prompts/BLERON_CODEX_PROMPT.md`, `prompts/ALEX_CODEX_PROMPT.md`, `prompts/IGNES_CODEX_PROMPT.md`, and `prompts/GJIN_CODEX_PROMPT.md`, each self-contained and instructing the relevant contributor to read AGENTS, PROJECT, CONTRACT, and their task, stay in their files, build/test, push their branch, and open a PR.
6. Define the **canonical shared API types** in `src/types/contracts.ts`. Gjin alone owns shared types; no one may silently change them.
7. Keep `src/app/page.tsx` and `src/app/globals.css` as minimal but polished starting points for Bleron to take over; no charts required. Design tone: premium lifestyle rewards meets warm coffeehouse moments, warm cream/espresso, one fresh green/coral accent, airy typography, cards, responsive layout, accessible interactions.
8. Commit a real `package-lock.json` and scripts `dev`, `build`, `lint`, `typecheck`, `test` where available. Do not rely on unspecified global tools.
9. Include a small smoke-test/check script if practical. No code should require live keys during `npm run build`.
10. Avoid introducing conflicting files or broad rewrites: each teammate must be able to work independently and merge small PRs.

## Canonical APIs (document shapes in CONTRACT.md and TS types)
- `GET /api/prices?region=SE4&date=YYYY-MM-DD` returns `PricesResponse`: region, date, currency=`SEK`, unit=`SEK/kWh`, ordered `intervals` of `{startsAt, endsAt, sekPerKwh}`, `sourceUrl`, `status` (`live|cached|demo|unavailable`) and `updatedAt`.
- `GET /api/opportunities?region=SE4` returns `OpportunitiesResponse` with sourced and dated items `{id,title,description,sourceUrl,publishedAt,expiresAt,eligibility,category,verified,demo}`. Never invent verified promotional offers.
- `POST /api/coach` accepts a text message and safe `CoachRequest` profile + optional price summary; returns short `CoachResponse` `{reply, quest, disclaimer, source, model}`. Quest includes id/title/description/evidence URL and optional modeled impact with explicit assumptions. AI is grounded ONLY in supplied verified data; never fabricates values, contracts, or partners.
- `POST /api/challenges/complete` accepts `{challengeId}`; responds `{progress,goal,rewardUnlocked,demo:true}`. In the no-auth demo, progress may be browser-local but must be transparently labeled and not grant a real merchant voucher.
- `GET /api/rewards` returns `{points,progress,goal,vouchers:[{id,title,code,isRedeemed,demo:true}]}`.
- `POST /api/rewards/redeem` accepts `{voucherId,code}` and responds `{status:'redeemed'|'already_redeemed'|'invalid',demo:true}`. Do not issue real merchant codes; implement idempotency and server-side validation for any future real rewards.

## Responsibilities / allowed paths AFTER bootstrap
- Bleron: `src/app/page.tsx`, `src/app/globals.css`, `src/components/**`, optional `src/app/(app)/**`, `public/**`, and mock fixtures in `src/lib/mock/**`. No business-logic ownership.
- Alex: `src/lib/supabase/**`, `supabase/**`, `src/app/api/challenges/complete/**`, `src/app/api/rewards/**`, `src/app/api/profile/**`. Needs safe RLS; no anonymous real reward issuance.
- Ignes: `src/lib/energy/**`, `src/app/api/prices/**`, `src/app/api/opportunities/**`; include deterministic price-window engine, robust handling of timezones/DST, sourced opportunity fixtures.
- Gjin: `src/lib/ai/**`, `src/app/api/coach/**`, `src/types/**`, docs/config, CI/PR review and Vercel; coordinates shared edits. Never put the Groq API key in `NEXT_PUBLIC_*`.

## Work procedure
A. Inspect repository and existing starter files. If existing docs or files are present, update them **without destructive changes**, adapting this spec rather than duplicating a second project. If empty, scaffold a current stable Next.js app with npm and generate docs.
B. Add minimal dependency set; use established shadcn setup only if it works without interactive questions, otherwise document the exact `npx shadcn@latest init` step for Bleron.
C. Implement the branded shell: working home screen, basic nav/links/placeholders, mock fallback status. Do NOT consume live AI or Supabase credentials yet.
D. Make source-of-truth contracts and task docs clear enough that all four can open separate branches immediately.
E. Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run build` (and tests if configured). Fix errors.
F. Commit changes to `main` with a descriptive bootstrap message. If authorized and the remote is configured, push with a normal `git push -u origin main`. If push is blocked, give the exact next command; do not force or rewrite history.
G. Do **not** create the four branches centrally unless instructed. Each person creates their own branch after cloning and accepting the GitHub collaborator invite.
H. At the end, report files created, test results, current git status/commit, whether remote push worked, what Gjin must do to set up Groq/Supabase/Vercel, and the exact copy/paste teammate commands and prompt-file paths.

## Time budget and reliability
Three-hour hard deadline: 0-20 min scaffold/contract/first deploy (Gjin does Vercel); 20-70 parallel work; 70-110 first integration; 110-150 polish; 150-180 freeze/test/pitch. Optimize for one good user journey and a live public URL, not a speculative full subscription platform.

Do the work now in this repository. Avoid asking questions unless access is required. Report any blockers clearly, without pretending services were configured.
