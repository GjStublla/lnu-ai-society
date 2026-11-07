# Energy library — Ignes / `feature/energy`

Live SE1–SE4 15-minute spot prices, contiguous cheap-window search and a
verified public-notice feed for the Savings Radar.

Owned paths: this folder, `src/app/api/prices/**` and
`src/app/api/opportunities/**`. Shared contracts (`src/types/contracts.ts`) were
not modified.

## Endpoints

### `GET /api/prices?region=SE4&date=YYYY-MM-DD`

- `region` defaults to `SE4`; invalid values return HTTP 400.
- `date` defaults to **today in Europe/Stockholm** (not UTC). Impossible dates
  (`2026-02-30`), dates before the source history floor (`2022-11-01`) and dates
  later than tomorrow are rejected with HTTP 400 — no upstream probing.
- Success is always HTTP 200 with `PricesResponse`:
  - `status:"live"` — fetched during this request.
  - `status:"cached"` — served from the per-process cache; `updatedAt` keeps the
    original fetch time.
  - `status:"unavailable"` — bounded `error` text, empty `intervals`; never a 500.
  - `status:"demo"` — only with an explicit `demo=1`; synthetic, never automatic.
- `intervals` are sorted, deduplicated and contiguous; a DST day can contain 92
  or 100 quarter-hour intervals. Negative prices are valid.
- The parser accepts 15/30/60-minute slots so historical hourly days
  (before October 2025) still work.
- `sourceUrl` is the exact upstream JSON URL, e.g.
  `https://www.elprisetjustnu.se/api/v1/prices/2026/11-07_SE4.json`.
- Upstream requests have a 6-second deadline (`AbortSignal.timeout`), a 512 KB
  declared-body cap and a 200-record cap, and are never made at build time
  (`dynamic = "force-dynamic"`; both routes build as ƒ).

`demo=1` is an additive, opt-in flag for offline demos. It is not part of
`docs/CONTRACT.md`; Gjin should either accept it or ask for its removal.

### `GET /api/opportunities?region=SE4`

Returns only sourced, verified public notices (`verified:true, demo:false`).
Each entry has a live HTTPS source and an evidenced date. Expired entries are
filtered out; an empty list is a valid result. There are no invented partner
deals, vouchers or exclusive discounts.

Current entries (checked 2026-11-07):

| Published | Source |
| --- | --- |
| 2025-09-16 | [Elpriskollen — quarter-hour contracts](https://elpriskollen.se/sidor/sank-dina-kostnader-med-kvartsprisavtal.html) |
| 2026-03-23 | [Elpriskollen — steer your electricity use](https://elpriskollen.se/sidor/styr-din-elanvandning.html) |
| 2026-03-23 | [Energimyndigheten — municipal energy advice](https://www.energimyndigheten.se/effektiv-energianvandning/hushall/energi--och-klimatradgivning/) |

The Energimyndigheten page exposes only “Senast uppdaterad 2026-03-23”, so
`publishedAt` carries that evidenced update date and the description says so.

## Using the window utility (client or server)

`src/lib/energy/windows.ts` is pure TypeScript with no network or Node APIs, so a
client component can import it after fetching prices:

```ts
import type { PricesResponse } from "@/types/contracts";
import { findCheapestWindow } from "@/lib/energy/windows";

const response = await fetch(`/api/prices?region=SE4`);
const prices = (await response.json()) as PricesResponse;

const window = findCheapestWindow(prices.intervals, {
  durationMinutes: 90,       // 60 | 90 | 120
  availableAfter: "18:00",   // local HH:mm
  availableUntil: null,
  minNoticeMinutes: 60,
  assumedKwh: 1.5,           // modelled load, not a measurement
  source: { sourceUrl: prices.sourceUrl, status: prices.status },
});
```

`window` carries ISO start/end instants, local `startLocal`/`endLocal`, the
time-weighted `averageSekPerKwh`, the interval count and an optional
`estimatedSek = averageSekPerKwh × assumedKwh`.

`availableUntil: "00:00"` means the end of the day, so an evening window that
finishes at midnight can still be selected. Availability is otherwise same-day:
overnight ranges such as 22:00–02:00 are not supported.

Adjacency is computed on instants, so gaps are never bridged and DST days are
handled by elapsed time. On the autumn DST night a window can show the same
local start and end (`02:45–02:45`); use the ISO instants to disambiguate.

## Honest copy (use it in the UI)

`src/lib/energy/disclaimers.ts` exports the exact wording:

- Spot prices exclude VAT, retailer markups, grid fees and taxes.
- Moving use in time changes *when* energy is used; it does not automatically
  reduce kWh.
- Cost estimates compare the same assumed kWh at two times and are modelled
  spot-price differences, not measured savings.
- Tomorrow’s prices normally arrive after about 13:00 Europe/Stockholm.
- Demo prices are synthetic.

## Tests

Offline feature tests (27, no network, Node 24 built-in runner + type stripping):

```bash
node --test "src/lib/energy/__tests__/*.test.mjs"
```

Covered: impossible/leap dates, Stockholm day bounds, 23/25-hour days, DST gap
and overlap conversion, parser sorting/validation/negative prices/gaps/overlaps/
oversized payloads, declared-body limits, hourly history (whole-hour windows
only), unpublished-vs-invalid payloads, URL building, 60/90/120-minute window
math, availability windows including “until midnight”, empty/unusable interval
lists, minimum notice, assumed-load estimates, failure copy, and the
verified-opportunity catalog.

Project checks:

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

`npm test` is the shell smoke test only; it does not validate energy math.

Integration checks were run against `next start` on 2026-11-07: live SE4 (96
intervals), cached second request, tomorrow live, 2026-03-29 → 92 intervals,
2026-10-25 → 100 intervals, 2025-06-01 → 24 hourly intervals, `demo=1`,
all 400/405 cases, and the failure path (DNS redirected to a closed port →
`status:"unavailable"` with bounded text, HTTP 200).

## Known limitations

- The cache is per serverless instance and is not durable; it only avoids
  duplicate upstream calls. `updatedAt` never pretends to be fresher than the
  original fetch.
- Upstream failures are cached for 30 seconds to avoid hammering the source;
  stale data up to 24 hours old may be returned as `cached` with an explanatory
  `error`.
- `/api/opportunities` is national; `region` is validated but does not filter
  the list yet.
- User availability is same-day only; a window cannot cross Stockholm midnight
  (a window ending exactly at midnight is supported via `availableUntil:"00:00"`).
- Records that fail validation are dropped and gaps/overlaps are logged
  server-side; they are never filled with invented slots.
