# WattHabit demo QA and pitch checklist

## Bootstrap gate (before teammate features)
- [ ] Clean clone on Node 24: `npm ci`, typecheck, lint, build, then `npm test`.
- [ ] Home, Challenges, Rewards and Radar anchors work; keyboard skip link and expandable explanation work.
- [ ] Shell renders without keys/login and makes no feature API calls.
- [ ] Preview copy identifies missing live prices, coach and saved progress; cup is illustrative.
- [ ] Rewards show **DEMO — NOT REDEEMABLE**; proposed premium cannot collect payments.
- [ ] Manual Vercel shell deployment by Gjin; invitations accepted by teammates.

The P0 checklist below is for the final integrated app. Bootstrap does not mark unbuilt features complete. `npm test` covers the shell only; owners supply and report feature tests.

## P0 features
- [ ] App deployed to Vercel and loads over HTTPS on phone (390px viewport) and desktop.
- [ ] Onboarding lets user choose SE4, housing electricity included/separate/unknown, preferred activity.
- [ ] API requests actually fetch Swedish 15-minute region-specific prices; includes source/timezone and honest fallback.
- [ ] Recommend a **continuous** affordable time window, not one low 15-minute slice for a two-hour appliance task.
- [ ] On-screen AI coach works with Groq model or clearly labeled deterministic fallback.
- [ ] A suitable quest changes mock progress; animation fills coffee cup smoothly.
- [ ] Demo voucher states **DEMO — NOT REDEEMABLE** and cannot be mistaken for partner offer.
- [ ] Opportunity Radar uses source URLs, published dates and verified-vs-demo labels.
- [ ] No user energy consumption or CO2 savings are described as measured without a meter.
- [ ] Secrets are not exposed in repository or browser network payloads.

## Failure injection
- [ ] Groq API key missing -> fallback still shows good, safe recommendation.
- [ ] Groq 429 -> gracefully degrade; no endless spinner.
- [ ] Tomorrow's price not published -> explain and show today's info or suitable alternative.
- [ ] Price feed fails -> honest source-unavailable message and clearly labeled offline example.
- [ ] Supabase credentials absent -> non-redeemable demo works without blank screen.
- [ ] Double-click 'complete challenge' -> no accidental multiple rewards if backend supports persistence.
- [ ] Refresh the demo and test intended persistence behavior.
- [ ] Mobile keyboard, buttons, color contrast, touch target size, no horizontal overflow.

## 3-minute demo script
1. 'Energy dashboards are boring; WattHabit makes better habits rewarding.' (20s)
2. Select student preferences (20s)
3. Show actual price-based schedule suggestion in SE4 and cite API source (40s)
4. Ask barista/coach a realistic follow-up question (30s)
5. Mark an educational / demo challenge complete and fill cup (25s)
6. Show non-redeemable example reward plus sourced local energy notice (25s)
7. Business model, limits, annual modeled impact assumptions and future provider/bill integration (20s)

## Pitch caveats
Free tier exists in demo; ~$5/mo plan and any real cafés are **proposed**, no live Stripe or agreements. Annual kWh/SEK/CO2e slide must state assumptions and distinguish avoided use from shifted use.
