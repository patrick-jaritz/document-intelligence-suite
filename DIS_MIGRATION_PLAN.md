# Migration Plan: Give document-intelligence-suite Its Own Repo

## The Problem

The root CODE folder is the `link-collector` GitHub repo, but it was repurposed as a
Vercel deployment shell for document-intelligence-suite. This created a mess:

- `package.json`, `node_modules`, `README.md` at the root all belong to dis, not link-collector
- Vercel was triggered by pushing commits to the wrong repo
- dis itself (this folder) has no git history of its own
- dis has its own duplicate set of debug .md files cluttering its root

## The Goal

Give `document-intelligence-suite/` a clean, standalone GitHub repo connected directly
to Vercel — no more shell repos or detours.

---

## Step 1 — Clean up the dis folder root

Before creating the repo, tidy up this folder. The debug .md files sitting at the root
of dis (CHANGES_SUMMARY.md, RAG_*.md, DEBUG_*.md, etc.) should be moved to
`docs/working-notes/` alongside the ones already there from the root cleanup.

```bash
cd /path/to/CODE/document-intelligence-suite
mkdir -p docs/working-notes
mv *.md docs/working-notes/    # keeps README.md safe too, move it back after
mv docs/working-notes/README.md .
```

Also check `docs/working-notes/` for any duplicates from today's earlier cleanup —
files with the same name now exist in two places.

---

## Step 2 — Create a new GitHub repo

On GitHub, create a new repo. Suggested name: `document-intelligence-suite`

Keep it private if the project is private. Do not initialize with a README (dis already
has one).

---

## Step 3 — Initialize git inside dis

```bash
cd /path/to/CODE/document-intelligence-suite
git init
git add .
git commit -m "Initial commit: document-intelligence-suite v2.3.0"
git remote add origin https://github.com/patrick-jaritz/document-intelligence-suite.git
git branch -M main
git push -u origin main
```

The `vercel.json` already inside this folder is correct:
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```
This will work perfectly once Vercel is connected at the right level.

---

## Step 4 — Reconnect Vercel

1. Go to vercel.com → your dis project → Settings → Git
2. Disconnect the current `link-collector` repo connection
3. Connect the new `document-intelligence-suite` repo
4. Set the **Root Directory** to `/` (since vercel.json is now at the repo root)
5. Trigger a deployment to verify it builds correctly

---

## Step 5 — Clean up the root CODE folder

Once dis is deployed and confirmed working from its own repo, remove the dis artifacts
that were living at the CODE root:

```bash
cd /path/to/CODE
rm README.md          # dis README, no longer needed here
rm package.json       # dis package.json
rm package-lock.json  # dis lock file
rm -rf node_modules   # dis node_modules (~90 folders worth)
```

The root `link-collector` git repo can then be either:
- Left as-is (it's just an empty shell at that point)
- Or properly restored to what link-collector was meant to be

The `_misc/vercel.json` can be deleted — it's been superseded by the one inside dis.

---

## Step 6 — Optional: sort out link-collector

The root repo points to `github.com/patrick-jaritz/link-collector`. There's a
`link-collector/` project folder elsewhere in CODE. If link-collector is an active
project, consider pointing the root git remote to that folder's code instead, or just
leave the root repo dormant.

---

## Risk Notes

- **Don't delete node_modules until Step 5** — if something goes wrong with the Vercel
  reconnection, you may need to run the project locally from the root in the interim.
- **Check environment variables in Vercel** — after reconnecting the repo, Vercel
  environment variables (Supabase keys, API keys, etc.) should carry over automatically,
  but worth verifying in the Vercel dashboard.
- **The `.vercel/` folder** inside dis — if it exists, delete it before Step 3. It
  contains project-specific Vercel IDs from the old link-collector connection and will
  cause conflicts.

---

## Summary

| Step | What | Risk |
|------|------|------|
| 1 | Clean dis root (move .md files) | None |
| 2 | Create new GitHub repo | None |
| 3 | `git init` + push | None |
| 4 | Reconnect Vercel | Low — brief deployment gap |
| 5 | Remove dis artifacts from CODE root | Low — do after confirming Step 4 |
| 6 | Sort out link-collector | Optional |
