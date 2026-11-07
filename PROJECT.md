# WattHabit — hackathon product brief

**Tagline:** Small habits. Real rewards.

**Current milestone:** Key-free repository bootstrap only. The shell and contracts are ready; the feature list below describes the four-person team's work, not features already delivered. No services or deployment are configured by bootstrap. Gjin handles invitations and deployment manually.

**Brand direction:** WattHabit is the product name. The animated coffee cup is a signature **reward-progress mechanic**, not the brand identity or the only reward. Product rewards may include cafés, discounts, campus events, and other local partners. Never imply those partnerships are already secured.

## Who and why
Swedish university students, including renters whose electricity is included in rent. They often have little reason to open an electricity dashboard and may miss useful price windows or legitimate local support offers. WattHabit makes small, realistic habits feel rewarding without pretending to measure appliances.

## Design concept
Adult-friendly, clean, premium lifestyle-rewards aesthetic with warm coffeehouse accents; minimal interface, not childish virtual-pet game. One signature **animated cup** fills with education/self-reported participation points (not measured kWh). Feel playful but usable in 20 seconds. Mobile-first, with possible future PWA support; no giant charts. shadcn/ui, Lucide, Motion; SVG cup is preferable to critical-path Three.js.

## End-to-end three-minute judge demo
1. One-time preferences: Swedish price zone (default SE4 for Växjö), electricity paid separately/included/unknown, preferred flexible activities (laundry/dishwasher/charging), availability.
2. Home: attractive animated coffee cup, 3/5 example stamps, today/tomorrow price event, one helpful mission.
3. Price recommendation: call the live 15-minute Elprisetjustnu API, calculate a cheap *contiguous* window that fits a user's schedule. Cite source; use safe fallback if missing.
4. Ask the grounded AI coach a specific question such as 'Why should I do laundry then?' Groq Qwen answers briefly; deterministic fallback when no key or rate limit.
5. Complete the demo quest: cup smoothly fills to a reward. Explicitly distinguish self-reporting from measured energy use.
6. Wallet: unlock a **non-redeemable demo voucher/QR illustration** with mock redemption state. Free tier digital stamps, proposed $5 premium partner perks.
7. Savings Radar: one sourced and dated verified energy notice or public discount; missing real partner offer -> show clearly labeled demo example, NEVER made-up verified promotions.

## Must have (P0)
- Responsive homepage and working navigation, real-price-powered UI, preference input, quest card, animated cup, demo progress/reward, Groq endpoint with graceful fallback, a sourced opportunity card, no secrets in client, published Vercel URL.

## Should have (P1)
- Supabase user preferences and completion persistence if keys available; local demo state if not, robust server-side reward safeguards; basic smoke tests and error states; optional in-app scheduled reminder opt-in (no fake push delivery).

## Future scope (after this hackathon)
- Optional electricity-bill analysis with consent/privacy, real negotiated perks, subscriptions, Web Push and utility integrations. No payment processing, live merchant vouchers, mandatory auth, bill storage or utility connection in this run. Optional lazy-loaded 3D can wait until the full core flow passes.

## Honest energy math
- Price = SEK/kWh * assumed or measured kWh. Compare identical expected loads at two windows; estimate currency differences, **not kWh reductions**. Student must have applicable time-varying tariffs to benefit financially. Mark energy and CO2 estimates as modeled and provide sources/assumptions. Do not imply that quest completion verifies reduced consumption.
- Supplied hackathon energy dataset is synthetic; can support a separately labeled modeled annual impact slide, not real-user measurement. No real electricity account or sensor is required to use MVP.

## Business model
Free: price windows, reminders, energy coach, educational quests, virtual cup and digital achievements, public sourced notices. Proposed premium ~$5/month: future negotiated café discounts, coffee vouchers, events, plus selected bill features. No payment collection or live redemption in hackathon demo.

## Success criteria
1. `main` deploys on Vercel and works on a phone.
2. Price engine shows legitimate live or explicitly labeled fallback results and timezone.
3. Coach stays grounded, concise, safe and optional under 429/no API key.
4. A user can complete full interactive journey with a demo coffee redemption.
5. Every claimed incentive has a real cited URL; no real-money claim based on self-report.
