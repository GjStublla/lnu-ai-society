# Bleron — Frontend & Experience Lead

**Branch:** `feature/frontend` | **Mission:** Make WattHabit feel like a polished, adult-friendly habit-and-rewards app, not a dashboard.

## You own
`src/app/page.tsx`, `src/app/globals.css`, `src/components/**`, `src/app/(app)/**`, `public/**`, `src/lib/mock/**`. You do NOT own backend/AI endpoints or shared type contracts.

## Must deliver by first integration checkpoint (~70 minutes)
Start from the existing key-free shell; do not re-scaffold. Budget 20–70 minutes (50 minutes) for the first complete frontend slice. Keep an offline demo when APIs are still absent. Coordinate shared package/config changes with Gjin; basic shadcn primitives and Motion are already available.
1. Mobile-first app shell with top logo, bottom navigation or simple tabs: Home, Challenges, Rewards, Radar.
2. Beautiful interactive SVG/CSS coffee cup filling by one of five stamps; animated with Motion, responsive, accessible reduced-motion fallback.
3. Home card for **today's price-powered quest** with time window, source, button, loading and unavailable states.
4. Tiny onboarding form (SE4 default, billing `included|separate|unknown`, activities, availability). No requirement to login to see demo.
5. Quests card and premium preview that says **Coming soon — proposed $5/mo**, not active payment.
6. Rewards wallet with mock voucher **DEMO — NOT REDEEMABLE**; real local promos not invented.
7. A compact barista-style coach panel using `/api/coach`; until merged, use mocks that match `docs/CONTRACT.md`.

## Quality bar
- Distinctive premium lifestyle rewards design, warm neutrals, tasteful fresh accent; professional typography, microinteractions, not cartoon mascots or huge analytics charts.
- shadcn/ui + Lucide. Prefer animated SVG to heavy Three.js; only add optional 3D if everything else passes build.
- Works at 375/390/430px widths, desktop, and keyboard; loading, skeleton, error/empty states.
- All API calls use documented contracts; no fake measured savings or unverified offers.

## Tests / acceptance
- Can explain a user's entire journey in under 60 seconds.
- Animated cup transitions 3/5 -> 4/5 (and goal state) in demo.
- UI does not crash if `/api/prices`, `/api/coach`, or Supabase unavailable.
- `npm run typecheck`, `npm run lint`, `npm run build` pass, screenshots provided.
- After build, `npm test` passes; test keyboard, reduced motion, missing endpoints and a clearly labeled browser-local demo. This smoke script does not replace your interaction checks.

## Remaining clock
70–110 integration, 110–150 polish and fallback checks, 150–180 freeze/test/pitch. No payment, utility connection, bill storage, real offers or mandatory auth.

## Handoff
Push `feature/frontend`, open PR to `main`, include screenshots and any contract issues for Gjin. Do not change `src/types/contracts.ts`.
