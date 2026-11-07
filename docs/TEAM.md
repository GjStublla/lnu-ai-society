# Four-person launch checklist and Git commands

## 0. Gjin bootstraps first
1. Clone the **repository**, not a teammate's feature branch: `git clone https://github.com/GjStublla/lnu-ai-society.git`.
2. The initial bootstrap supplies a buildable shell, contracts, handoff docs and `package-lock.json` on main. `CODEX_SETUP_PROMPT.md` is retained setup reference; do not re-run scaffolding.
3. Check build and push `main` for the initial bootstrap only. Further changes use feature branches and PRs. No issue creation is necessary to start.
4. In GitHub repository Settings -> Collaborators -> Add people, invite **Bleron, Alex, Ignes by their exact GitHub usernames**. They must accept the invites to push.
5. Connect `main` to Vercel immediately; Gjin owns all deployments.

## 1. All team members after initial commit
```bash
git clone https://github.com/GjStublla/lnu-ai-society.git
cd lnu-ai-society
npm ci
```

Use Node 24 LTS (`.nvmrc`). No keys or `.env.local` are required. After switching to your branch, run `npm run dev` and open http://localhost:3000. Stop dev with Ctrl+C when done. The initial API paths are contracts only and return 404 until owners merge implementations.

Switch to your assigned prepared branch (Bleron, Alex and Ignes):
```bash
# Bleron
git switch --track origin/feature/frontend
# Alex: git switch --track origin/feature/backend
# Ignes: git switch --track origin/feature/energy
# Gjin: git switch -c feature/ai-integration
```

| Person | Switch to your assigned branch | Read task | Paste this prompt |
| --- | --- | --- | --- |
| Bleron | `git switch --track origin/feature/frontend` | `tasks/BLERON.md` | `prompts/BLERON_CODEX_PROMPT.md` |
| Alex | `git switch --track origin/feature/backend` | `tasks/ALEX.md` | `prompts/ALEX_CODEX_PROMPT.md` |
| Ignes | `git switch --track origin/feature/energy` | `tasks/IGNES.md` | `prompts/IGNES_CODEX_PROMPT.md` |
| Gjin | `git switch -c feature/ai-integration` | `tasks/GJIN.md` | `prompts/GJIN_CODEX_PROMPT.md` |

For an existing local checkout: first inspect `git status`, save your work, then `git fetch origin`. If your feature branch already exists locally, `git switch feature/frontend` (use your role's branch) rather than creating it again. For Gjin's new branch, first `git switch main` and `git pull --ff-only origin main`. Do not discard changes or reset history. The three prepared branches begin at the same bootstrap commit as main; collaborators must accept invitations before pushing.

Everyone reads their `tasks/NAME.md` and uses their own prompt in `prompts/NAME_CODEX_PROMPT.md`. If you clone before the prepared branches appear, run `git fetch origin` before switching. Do not create duplicate remote branches.

## 2. Delivery and merging
```bash
npm run typecheck
npm run lint
npm run build
npm test
git status
git add <your-owned-files>
git commit -m "feat: descriptive task"
git push
```
Create a PR to `main` through GitHub UI or `gh pr create --base main --fill`. Attach checks, screenshots and any issue. **Gjin reviews, merges, and verifies Vercel.** Nobody pushes directly to main after bootstrap. No force push. After any merge, sync with main and resolve conflicts with owner help; do not replace someone's files.

To sync your feature branch, commit your work, then `git fetch origin` and `git merge origin/main`. Push normally. Shared package files, scripts, layout, utilities and contracts are coordinated by Gjin; feature owners propose exact changes. Use the existing aliases `@/types/contracts`, `@/components/ui/*` and `@/lib/utils`. For feature-specific tests, keep files in your owned paths and coordinate any test-runner configuration with Gjin.

## 3. Clock (180 minutes)
- 00-20: scaffold + contracts + invitations + first Vercel shell deployed
- 20-70: four independent features in parallel
- 70-110: Gjin merges first PRs and verifies vertical slice
- 110-150: QA, polish, AI fallback tests, mobile fixes
- 150-180: freeze; rehearse, backup demo, final production checks

## 4. Blockers
If you need changes to somebody's files or the contract, send a short message: desired change, files impacted, why, and deadline. Don't silently edit. If Vercel env variables are missing, features should render safe demo/disabled states. GitHub `Contributors` is populated from commits; collaborators are invited in settings.
