# WattHabit demo verification and presentation

## Recorded checks — 2026-11-07
- [x] Integrated frontend/energy/backend/coach passes typecheck, zero-warning lint and production build without live keys.
- [x] 25 coach tests: validation, grounding, trusted server windows, provider failure/429, byte limits, deadlines and cancellation.
- [x] 33 energy tests: negative prices, continuity, modeled costs, 92/100-slot DST days, availability, impossible dates, actual streamed byte cap and sourced catalog.
- [x] Offline production smoke: page/navigation/assets, key-free coach fallback, invalid requests, unavailable prices, explicit demo prices and sourced Radar.
- [x] Cookie reward API: 3→4→5, repeated completion unchanged, locked/invalid redemption rejected, repeat redemption idempotent, browser isolation.
- [ ] Final production HTTP acceptance after integration deploy: command below.
- [ ] Real browser onboarding, click-through, refresh persistence, mobile overflow, keyboard focus and reduced-motion check. Browser automation stopped because it could not verify the current URL; source/HTTP checks do not replace this gate.
- [ ] Supabase live migrations/auth/RLS. Not required for this no-login demo; do not claim them as tested.

## Repeatable three-minute presentation
1. Open the public URL in a fresh browser profile, or use **Rewards → Reset browser demo**. Reset restarts local preferences/stamps; the separate HttpOnly reward history remains. Start at 3/5 example stamps.
2. Onboard with SE4, **electricity included in rent** or your actual billing choice, laundry, and a realistic free-from time. Reminders are in-app only.
3. Show Today: price source/status, Europe/Stockholm, the complete eligible window and modeled spot-cost comparison. Actual prices change: if no useful window exists, show the honest message and habit suggestion. If the feed fails, use **Try demo prices** and say they are an example.
4. Open **Why?** / the coach. Ask “Why should I move laundry?” Show its source, billing caveat and Groq-or-written-fallback label. The server verifies numerical price facts independently; the model selects reviewed guidance. Shifting the same task does not reduce kWh.
5. Open Challenges. For a predictable cup-fill demo, accept and complete **two different habit challenges**. Each adds one self-reported participation stamp, taking 3/5 to 5/5. A tomorrow price quest cannot be completed today; do not depend on tomorrow's window for the live unlock.
6. Open Rewards: show **DEMO — NOT REDEEMABLE**, the illustrative code/QR and **Redeem (demo)**. Explain that this records demo state and issues nothing of value. Plus is a proposed ~$5/month plan; no payments or secured partners.
7. Open Radar: show one of the two dated Elpriskollen public guidance cards and its official source. These are public energy guidance, not exclusive offers or subsidies.

## Production API acceptance
After Vercel reports the integrated commit ready:

    node scripts/demo-workflows.mjs --url https://lnu-ai-society.vercel.app
    node scripts/demo-workflows.mjs --url https://lnu-ai-society.vercel.app --live-coach

The second command makes one coach request that may consume Groq quota. It accepts a transparent fallback as a functioning route and prints which source was returned; inspect that result before claiming live AI. The script checks the production page, current Stockholm-date prices, explicit demo fixture, invalid inputs, sourced Radar and isolated-cookie reward unlock/redeem. It does not click the frontend or prove Supabase persistence.

## Final manual phone/browser gate
- Complete onboarding; preferences reopen correctly from the settings control.
- Verify source/status and window fit availability; tomorrow missing does not block the app.
- Ask the coach; fallback/error never leaves an endless spinner.
- Complete two distinct habits; cup fills, duplicate completion is disabled, voucher shows DEMO.
- Redeem once; repeat is disabled. Refresh preserves this browser's demo state.
- Use each navigation link and Radar source link. Check 390px width, no horizontal overflow, readable contrast and keyboard focus.
- Enable reduced motion in the device/browser and confirm progress remains usable.

## Pitch boundaries
Participation is self-reported, not verified electricity savings. Spot prices exclude VAT, taxes, network fees and retailer margins; fixed-price or included-rent users may see no personal bill saving. Habit impact figures are modeled with assumptions. No live meter, payment, real voucher, merchant partnership, bill upload or push delivery is implemented. Synthetic annual-impact slides must say **synthetic modeled scenario**.
