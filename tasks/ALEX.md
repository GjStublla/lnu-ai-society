# Alex — Supabase Backend & Rewards Lead

**Branch:** `feature/backend` | **Mission:** Make preferences/progress/reward data safe and reliable, while retaining a no-login demo path.

## You own
`src/lib/supabase/**`, `supabase/**`, `src/app/api/challenges/complete/**`, `src/app/api/rewards/**`, `src/app/api/profile/**`. Do not change shared contracts or frontend files.

## Must deliver by first integration checkpoint (~70 minutes)
Work in the initialized repo, 20–70 minutes (50-minute first slice); do not re-scaffold. Supabase packages and Zod are installed, but there are no client instances, SQL migrations or backend routes yet. Keep tests inside owned paths; ask Gjin for shared runner/config changes.
1. Supabase client helpers (browser and server where needed) with env validation and safe behavior if keys are missing.
2. SQL migration for user profiles/preferences, challenge completions, wallet/earned vouchers. Enable RLS on all user tables; use `auth.uid()` policies; unique constraints against duplicate challenge completions per day/session where appropriate.
3. Implement `POST /api/challenges/complete` with exact response contract. For real authenticated records, make completion idempotent. For unauthenticated demo, return an obvious non-redeemable demo flow, or document safe client-local fallback (no ephemeral serverless memory assumed).
4. Implement `GET /api/rewards` and `POST /api/rewards/redeem` as demo-safe routes according to `docs/CONTRACT.md`. Do not mint real voucher codes. Prevent repeated redemption for authenticated state.
5. Supply clear SQL execution / Supabase project setup instructions for Gjin. Ask for public URL/publishable key privately; never commit secrets.

## Security / business constraints
- No credentials in client except `NEXT_PUBLIC_SUPABASE_URL` and public **publishable** key (RLS required).
- No service-role key in client, browser, or git. Avoid service-role entirely unless necessary.
- Real paid tiers and café redemption are future scope. **DEMO — NOT REDEEMABLE** labels mandatory.
- Prefer minimal durable schema and simple tests over heavy auth setup.

## Tests / acceptance
- Demo works without Supabase connection. No API crashes or infinite loading.
- SQL policies protect different users; input is validated; repeated completion cannot farm real points.
- `npm run typecheck`, `npm run lint`, `npm run build` pass, plus a test of reward repeat behavior.
- Run `npm test` after build; separately verify malformed bodies, unauthenticated demo, cross-user RLS, completion repeats and redemption repeats. Do not present a passing shell check as DB validation.

## Remaining clock
70–110 integration with Bleron/Gjin, 110–150 error and persistence checks, 150–180 freeze/test/pitch. If credentials are absent, ship documented safe demo behavior and reviewed SQL instructions; do not create accounts or claim migrations ran.

## Handoff
Push `feature/backend` with PR to `main`; report migration steps, env names, endpoint sample responses and risks to Gjin.
