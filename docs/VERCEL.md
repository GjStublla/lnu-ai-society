# Vercel — owned by Gjin

## Integrated demo
The existing project serves https://lnu-ai-society.vercel.app and follows `main`. Groq configuration was entered privately in Vercel; no key belongs in Git or client bundles. After the integration merge, wait for that commit's deployment to become ready, then run the production acceptance commands in `docs/DEMO_CHECKLIST.md`. Supabase migrations/authentication remain a separate unverified setup; they are not a dependency of the cookie/local no-login demo. The original bootstrap instructions below are retained as setup reference, not a claim that the current deployment is still only a shell.

**Manual action required:** Bootstrap does not create accounts, invite users, connect a Vercel project or deploy. The shell can be deployed with all optional variables blank. Do not wait for Groq or Supabase to share the first shell URL.

1. After the bootstrap commit reaches `main`, visit https://vercel.com/new and import `GjStublla/lnu-ai-society`. Framework should be detected as **Next.js**. Root directory is repository root.
2. Deploy early, even with only the shell. Confirm a public HTTPS URL renders on a mobile browser.
   Use Node **24.x**, npm lockfile, install `npm ci`, build `npm run build`, default Next.js output (no static-export override). Root directory: `.`. No `vercel.json` is required. Production branch: main.
3. Add server-side environment variables in Vercel Settings -> Environment Variables, then redeploy:
   - `GROQ_API_KEY` (SECRET; do not prefix with `NEXT_PUBLIC_`)
   - `GROQ_MODEL=qwen/qwen3.8-27b` (preview; verify enabled)
   - `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b`
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as provided by Alex (if Supabase is enabled)
   - `SUPABASE_SERVICE_ROLE_KEY` server-side only **if** Alex's secure server flows truly need it; otherwise omit.
4. Vercel production branch: `main`; feature PRs may get preview URLs. No separate project per developer.
5. Never copy `.env.local` or private API keys to GitHub/Slack/demo slides; rotate exposed keys.
6. Test four live requests after PR merges: `/`, `/api/prices?region=SE4&date=YYYY-MM-DD` (current Swedish local date), `/api/opportunities?region=SE4`, `POST /api/coach` via UI (real/fallback). Verify rewards stay visibly DEMO.
7. If a production deploy fails, read Vercel build logs and fix only the relevant PR; do not blindly revert everyone's work or reset history.
8. Keep a fallback screen and a short recorded demo if the live API or network becomes unavailable, but don't misrepresent cached data as live.

## Groq setup after the coach PR
The coach implementation/setup and frontend contract are documented in `docs/AI_INTEGRATION.md`. `npm run check:groq` provides an explicit read-only authenticated model listing check without printing credentials or generating a completion. The no-key route works immediately; leave the key absent until intended public access and account spending controls are configured.
Privately create a key in the Groq console. The public model list checked 2026-11-07 includes `qwen/qwen3.8-27b` as preview and `openai/gpt-oss-20b` as production. This does **not** verify your account permissions or free quota. Verify both IDs in your console or authenticated `GET https://api.groq.com/openai/v1/models` on your machine; do not paste the key or headers into chat. Keep the requested preferred ID configurable. If it is inaccessible, the coach must try the configured provider fallback, then explicitly labeled deterministic guidance. Check account rate/spend limits. Bootstrap makes no paid requests.

## Supabase setup after Alex's PR
Alex provides project/migration instructions, RLS and repeat-completion tests. Apply reviewed migrations privately, test two separate users, and add only the project URL and publishable key to local/Vercel environment variables. Do not expose a service-role key. Without Supabase, keep the labeled browser-local demo usable; no mandatory auth or real reward issuance. No database is created or migration executed by bootstrap.

## Stage-specific verification
Before features merge: check `/`, nav anchors, expandable explanation and demo disclosures. API 404s are expected in the starter. After each owner's PR: run the implemented API happy path plus missing-service paths in `docs/DEMO_CHECKLIST.md`. Redeploy when variables change; check both preview and production scopes. Record the public URL and actual live-vs-fallback status for the team.

## Important
Vercel may need an owner to authorize the GitHub connection. Our Codex initializer does **not** log into Vercel or create accounts. Do not delay teammates waiting for Vercel: code can merge and local checks run while Gjin configures the deployment.
