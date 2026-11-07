# Source of truth for the MVP

## Bootstrap references (checked 2026-11-07)
- Next.js App Router installation / Node requirements: https://nextjs.org/docs/app/getting-started/installation
- shadcn existing Next.js setup and CLI: https://ui.shadcn.com/docs/installation/next and https://ui.shadcn.com/docs/cli
- Groq's public catalog lists requested `qwen/qwen3.8-27b` as **preview**, and `openai/gpt-oss-20b` as production. Gjin must verify account availability, permissions and limits; public listing is not an authenticated integration test. https://console.groq.com/docs/models
- Elprisetjustnu documents 15-minute prices since 2025-10-01, earlier hourly history, and tomorrow publication no earlier than 13:00. Respect actual timestamps/offsets on DST days. https://www.elprisetjustnu.se/elpris-api
- Supabase current Next.js quickstart uses URL/publishable key and requires deliberate Data API privileges plus RLS; Alex owns the actual implementation. https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

The initial shell has one link to public API documentation; it does not claim to have verified a promotional opportunity. No live-price request, authenticated model call or Supabase connection was tested by bootstrap. These references are technical integration evidence, not proof of personal savings or partner agreements.

## Coach implementation references (checked 2026-11-07)
- Groq chat-completions endpoint, model/response format/token parameters: https://console.groq.com/docs/api-reference
- Both requested models support strict JSON schema; model output is still validated and reduced to a reviewed topic selection: https://console.groq.com/docs/structured-outputs
- Model listing is available through authenticated GET `/openai/v1/models`; a listing is not proof of generation permissions or quota: https://console.groq.com/docs/models
- Groq limits can apply at organization level; the route does not retry 401/429 on a second model. Gjin must check actual account limits and spending controls: https://console.groq.com/docs/rate-limits
- Factual text follows the product's tariff/participation constraints and the public Elprisetjustnu price documentation above. No invented numeric price window, impact or merchant evidence is generated. See `docs/AI_INTEGRATION.md` for the deliberately constrained AI-selection boundary.

- Swedish 15-minute spot price API, SE1-SE4, upstream schema and spot-price caveats: https://www.elprisetjustnu.se/elpris-api
- Official Groq supported models (check availability and preview status at runtime): https://console.groq.com/docs/models
- Groq API compatibility: https://console.groq.com/docs/openai
- Groq free-tier/account rate limits: https://console.groq.com/docs/rate-limits
- Supabase Next.js guidance: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase auth and RLS: https://supabase.com/docs/guides/auth
- Vercel Git deployment basics: https://vercel.com/docs/deployments/git
- Swedish energy authority: https://www.energimyndigheten.se/
- Official Swedish electricity contract comparison service: https://elpriskollen.se/

## Data and claims rules
Elprisetjustnu prices are market spot prices excluding taxes, supplier markups, VAT and network charges. A low spot price cannot by itself prove user savings. Some users pay flat rates or have electricity included in rent.

For a savings estimate, record the assumed device kW, operating duration, original and alternate spot price, and contract caveat. Shifting usage yields a modeled SEK difference, NOT kWh reduction. An avoided kWh requires an assumed reduction in consumption; CO2e requires a valid intensity source. Avoid fabricating local offers, subsidy eligibility, or verified partnerships; every verified card needs its own source URL and publication/expiry dates.

## Preserved synthetic analyses
`data_raw/energy_hackathon_participants/README.md` explicitly describes fictional Swedish student flats and synthetic hourly prices/carbon factors. `data_cleaned/`, `charts/` and existing Python scripts are derivative analysis assets, not verified observations, and were not recalculated or audited during bootstrap. Any slide using them must say **synthetic modeled scenario**, state assumptions, and keep live quarter-hour API data separate.
