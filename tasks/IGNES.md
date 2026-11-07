# Ignes — Energy Intelligence & Savings Radar Lead

**Branch:** `feature/energy` | **Mission:** Turn real 15-minute electricity prices into simple, helpful, honest student challenges.

## You own
`src/lib/energy/**`, `src/app/api/prices/**`, `src/app/api/opportunities/**`. No AI, Supabase schema, or core UI edits.

## Must deliver by first integration checkpoint (~70 minutes)
Budget 20–70 minutes (50 minutes) for prices/window utility plus a minimal empty-or-verified radar. No energy implementation exists yet. Keep fixtures/tests under `src/lib/energy/**`; do not alter Bleron's mock area or shared scripts/dependencies without Gjin.
1. `GET /api/prices?region=SE4&date=YYYY-MM-DD` fetches real daily JSON from Elprisetjustnu. Whitelist SE1-SE4, validate date, cache/revalidate appropriately, normalize `SEK_per_kWh` and time fields to `PricesResponse`.
2. Utility to search for the cheapest **contiguous** 60/90/120-minute windows subject to local availability and minimum notice, not just the single cheapest 15-minute slot. Return start, end, average cost, and data source. Handle DST and missing intervals safely.
3. Price-driven quest examples (plan laundry during a suitable window, unplug genuinely unused devices, short educational quiz). Clearly separate price-shift scenarios from consumption reduction.
4. `GET /api/opportunities?region=SE4`: a small, readable verified news/opportunity feed **with real dated source URLs**. If no trustworthy offer can be confirmed, return only a blank verified list or a conspicuous demo fixture; never fake exclusive partner deals or 100 SEK eligibility.
5. Deterministic mock price fixture for offline showcase, always labeled `status:'demo'`, never silently posed as live.

## Important real-world constraints
- Source: https://www.elprisetjustnu.se/elpris-api ; spot prices exclude VAT, retailer margin, network fees and taxes; tariff choice matters.
- Tomorrow data may be absent until after about 13:00 local time. Timezone is `Europe/Stockholm`. DST transition days may have !=96 slots.
- No fabricated kWh, SEK, kgCO2e, carbon or appliance readings. Compare equal assumed kWh at two price windows; don't claim load shifting reduces energy use.

## Tests / acceptance
- Verify a real/current valid URL, invalid region handling, missing tomorrow data, DST edge, and contiguous window calculations.
- TypeScript types align with `src/types/contracts.ts`; route always returns valid response shape.
- `npm run typecheck`, `npm run lint`, `npm run build` pass.
- Run `npm test` after build. Separately test 92/100-slot DST days, negative prices/spikes, gaps, bounded slow upstream requests, missing tomorrow, invalid region/date and schedule-constrained contiguous windows. Record source URL/status/freshness in sample JSON.

## Remaining clock
70–110 first integration, 110–150 correctness/failure polish, 150–180 freeze/test/pitch. Don't expand into speculative forecasting or invent dated promotions.

## Handoff
Push `feature/energy`, open PR to `main`, provide sample JSON responses, source references and known data caveats to Gjin.
