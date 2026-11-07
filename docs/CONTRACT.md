# WattHabit API and integration contract v1 — OWNER: Gjin

This is the **single source of truth**, mirrored as TypeScript types in `src/types/contracts.ts`. All timestamps are ISO8601 with offsets; display in `Europe/Stockholm`. All energy prices are **SEK/kWh**, not öre/kWh. The app must handle unavailable services gracefully. Prefer JSON. Validation belongs on the server.

**Implementation status:** Prices, opportunities, coach, challenge completion and demo rewards routes are integrated with the frontend. The UI persists preferences and participation locally; the no-auth rewards API uses an isolated HttpOnly demo cookie. Neither represents verified electricity savings or a real reward entitlement. Coach price facts come from the server price service and shared window engine; client price summaries remain untrusted. Import types with `import type` and do not create parallel response definitions. Existing success shapes are preserved; only Gjin may approve changes.

## Transport and validation
- All routes return JSON. Valid requests use HTTP 200, including documented demo/unavailable/fallback responses. Wrong method: 405. Invalid region/date/JSON/body: HTTP 400 with `ApiErrorResponse = { error: string }`; show useful bounded text without private provider errors. Frontend checks `response.ok` before treating JSON as a success type.
- The query date is a real calendar day `YYYY-MM-DD` in Europe/Stockholm, not the caller machine's UTC date. Default omitted region to SE4. For prices, default omitted date to today's Stockholm date; do not roll impossible days into another month.
- Put a finite upstream deadline on external calls (target <=8 seconds), bound responses, validate upstream fields, and never call live services at build time. Demo/cached data must identify its true status and freshness; `updatedAt` records the data fetch/update time (or failed attempt when unavailable). Cached responses retain the original fetch time; refreshing a screen does not make the data live.
- Negative spot prices are valid. Normalize order by instant; validate finite prices, valid start/end instants and contiguous elapsed intervals. Do not compare ambiguous local clock strings or assume a day is 24 hours. A Stockholm DST day may have 92 or 100 quarter-hour intervals; accept real source durations rather than inventing missing slots.

## 1. Prices (Ignes)
`GET /api/prices?region=SE4&date=2026-11-07`

```ts
type Region = 'SE1' | 'SE2' | 'SE3' | 'SE4';
type DataStatus = 'live' | 'cached' | 'demo' | 'unavailable';
type PriceInterval = { startsAt: string; endsAt: string; sekPerKwh: number };
type PricesResponse = { region: Region; date: string; currency: 'SEK'; unit: 'SEK/kWh'; intervals: PriceInterval[]; sourceUrl: string; status: DataStatus; updatedAt: string; error?: string };
```

For SE4 use `https://www.elprisetjustnu.se/api/v1/prices/YYYY/MM-DD_SE4.json`; the upstream data fields include `time_start`, `time_end`, `SEK_per_kWh`. 15-minute price slots since Oct 2025. Validate region/date, sort times, convert to consistent data types, don't assume 96 slots during DST changes. Tomorrow's data may not yet exist. Source spot price excludes VAT/taxes/markup/grid fees. Return `status:'unavailable'` with empty intervals, not an exception that crashes the page.

## 2. Sourced opportunities (Ignes)
`GET /api/opportunities?region=SE4`

```ts
type Opportunity = { id: string; title: string; description: string; sourceUrl: string; publishedAt: string; expiresAt: string | null; eligibility: string; category: 'energy' | 'student' | 'partner'; verified: boolean; demo: boolean };
type OpportunitiesResponse = { opportunities: Opportunity[]; updatedAt: string };
```

Only say `verified:true` when a genuine public URL supports the title, dates and eligibility. Never fabricate café partnerships or claim an unrelated public discount is exclusive to WattHabit. For examples use `demo:true, verified:false` and visible demo labels. Empty verified feed is acceptable.

`publishedAt` must be an evidenced publication date, not the retrieval date. `expiresAt:null` means no evidenced expiry, not guaranteed continuing eligibility. Omit unverifiable entries; don't invent a date to satisfy the type. Expired items must not appear actionable. A reference link in the initial shell is not an opportunity fixture or an endorsed offer.

## 3. Groq coach (Gjin)
`POST /api/coach`

```ts
type Housing = 'included' | 'separate' | 'unknown';
type CoachRequest = { region: Region; housing: Housing; activities: string[]; availableAfter: string | null; priceSummary: { cheapestWindowStart: string | null; cheapestWindowEnd: string | null; relativePriceDescription: string | null } | null; message: string };
type EstimatedImpact = { kwh: number | null; sek: number | null; kgCo2e: number | null; assumption: string };
type Quest = { id: string; title: string; description: string; evidenceSource: string | null; estimatedImpact: EstimatedImpact | null };
type CoachResponse = { reply: string; quest: Quest | null; disclaimer: string | null; source: 'groq' | 'fallback'; model: string | null };
```

Only the server can call Groq. Preferred model configurable `GROQ_MODEL=qwen/qwen3.8-27b`, fallback `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b`; model must be verified as accessible to the account. If API key missing, rate-limited, model unavailable, or provider fails, respond quickly with `source:'fallback'` and a useful deterministic recommendation. AI must never invent electricity measurements, offers, discounts, unsupported source links, confirmed appliance identities, or verified CO₂ data. Do not allow unconstrained chat injection to set rewards.

Treat **all client input, including priceSummary**, as untrusted. Recompute or verify price facts against Ignes's server data before grounding AI; otherwise ignore the summary and offer sourced general guidance. `message`: trimmed 1–1200 characters; `activities`: at most 3 entries from `laundry|dishwasher|charging`; `availableAfter`: local `HH:mm` or null. Region/housing use their enums. `priceSummary:null` means absent. Validate paired ISO window timestamps/order if a summary is supplied. Bound request size and reject malformed bodies; do not forward arbitrary nested values to the provider.

`Quest.evidenceSource` is the evidence URL (HTTPS allowlisted/verified source) or null. Unsupported numeric impacts stay null; a non-null `EstimatedImpact` requires explicit assumptions. Never interpret shifted kWh as avoided kWh. `source:'fallback', model:null` marks deterministic guidance; a provider reply names the actual successful model. The model cannot create rewards or validate completion. The coach has no tool for payments or real voucher issuance.

**Current coach slice:** see `docs/AI_INTEGRATION.md`. Client summaries are validated then discarded; a server-only adapter loads normalized prices and derives complete eligible windows using the shared energy engine. Only fresh live/cached facts with the expected source/region/date can enrich guidance. Groq selects a reviewed topic, while the server owns visible text, evidence and participation-planning quests; label this as AI-selected reviewed guidance. Impacts stay null. Missing summary may be omitted and is normalized to the canonical null value. Invalid inputs use HTTP 400; valid fallback uses 200/no-store. No key or live provider is required for build/tests.

## 4. Progress and rewards (Alex)
`POST /api/challenges/complete` request: `CompleteChallengeRequest = { challengeId: string }` and response:

```ts
type CompleteChallengeResponse = { progress: number; goal: number; rewardUnlocked: boolean; demo: true };
```

`GET /api/rewards` response:

```ts
type Reward = { id: string; title: string; code: string; isRedeemed: boolean; demo: true };
type RewardsResponse = { points: number; progress: number; goal: number; vouchers: Reward[] };
```

`POST /api/rewards/redeem` request: `RedeemRequest = { voucherId: string; code: string }`; response:

```ts
type RedeemResponse = { status: 'redeemed' | 'already_redeemed' | 'invalid'; demo: true };
```

Use RLS for real Supabase records and unique completion constraints, do not let clients mint real merchant discounts. For demo with no Supabase, local state is permissible only with clear **DEMO — NOT REDEEMABLE** labeling. Don't assume serverless in-memory state survives requests. The frontend may use mock fixtures adhering exactly to these structures until the PR is merged.

Use bounded allowlisted challenge/voucher IDs and validate codes on the server. Progress counts participation. A repeated completion for the same user/challenge/Stockholm day returns unchanged progress; duplicate redemption returns `already_redeemed`. Alex must document durable transaction/unique-constraint behavior and verify ownership/RLS before a real account path. Current voucher types remain `demo:true`; no merchant code can be granted. Without a session or Supabase, GET rewards may return zero progress and no vouchers; Bleron can demonstrate browser-local progress with a visible demo label. Alex and Bleron must document that local state is not a server-validated entitlement. No shared server-memory counter or misleading durable redemption claims.

`/api/profile` is reserved for Alex; no profile endpoint contract is introduced by this bootstrap. Coordinate any needed shared shape with Gjin before adding it.

## Integration boundaries
- Bleron calls typed fetch clients or passes mocks conforming to these responses; does not implement underlying APIs.
- Ignes does not create chat, AI model calls, or rewards tables.
- Alex does not alter AI/energy endpoints or UI.
- Gjin owns `src/types/contracts.ts` and integration adapters. Any contract change must be discussed explicitly with all four people.
