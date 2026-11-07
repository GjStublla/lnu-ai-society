# WattHabit backend setup

The rewards API runs in demo mode with no Supabase settings and no login. New browser sessions start with three example stamps. Complete two different supported challenges to unlock a demo voucher. Its label is **DEMO — NOT REDEEMABLE**. The demo stores progress in a browser cookie, expires after 30 days and confers no entitlement. Only the signed-in path uses database state. Demo requests from two tabs at the same time can overwrite one another.

## Connect a Supabase project

1. Use a development Supabase project or preview branch for integration. Apply the SQL file under `supabase/migrations/` to that database using your team's migration workflow. For a fresh project you can also run the file in the Supabase SQL Editor once. Use one method so the migration isn't replayed.
2. In the Supabase dashboard, copy the target's Project URL and **Publishable key** from **Connect**. Add these to the ignored `.env.local` and restart Next.js. For Vercel, add both values to the appropriate environment and rebuild.
3. Use `createSupabaseBrowserClient()` from `@/lib/supabase/client` to establish a Supabase Auth session when sign-in is added. The route handlers verify the session and call the database as that user. The profile table is ready for an authenticated settings flow when its endpoint contract is agreed.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## API integration

| Request | Example or result |
| --- | --- |
| `POST /api/challenges/complete` | Send `{"challengeId":"plan-laundry"}`. Returns progress, goal, unlock state, and `demo: true`. |
| `GET /api/rewards` | Returns points, cup progress, goal and the earned voucher, if any. |
| `POST /api/rewards/redeem` | Send the voucher's ID as `voucherId` and its code as `code`. Returns `redeemed`, `already_redeemed`, or `invalid` with `demo: true`. |

For POST requests use `Content-Type: application/json`. The challenge IDs match the coach catalog: `plan-laundry`, `plan-dishwasher`, `plan-charging`, and `learn-spot-prices`. One stamp is recorded per challenge per Stockholm calendar day. Signed-in players start at zero. The cup caps at five stamps and unlocks one demo voucher. Rewards are participation records.

The signed-in routes use Postgres uniqueness constraints and row-level security for each user's records. They return a generic HTTP 503 if the signed-in database path fails, so a temporary database problem cannot appear to change a player's real progress.

## Verification

With Supabase env variables unset, run `npm run build` then `node supabase/test-demo.mjs` for the API demo checks. The standard `npm test` is a separate smoke test for the app shell.
After applying the migration to a disposable development database, run the checks below as the migration owner. They verify access for two distinct users and check that completion and redemption are idempotent. The SQL rolls back its test data.

```sh
psql -X "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/checks/backend.sql
```
