---
name: ship
description: Safely commit and push Together app changes to origin/main (which Codemagic builds). Use when the user says "ship", "push dette", "send til GitHub/Codemagic", or wants local changes published. Handles the pull-rebase-before-push requirement and validates codemagic.yaml before it can break a CI run.
---

# Ship: safe publish to origin/main

Codemagic builds GitHub `origin/main`. The remote regularly receives commits this
clone doesn't have (CI build-number bumps, pushes from the other clone), so a
plain `git push` is frequently rejected. This skill makes publishing safe and
boring.

## Steps

1. **Verify you are in the right repo.** Run `git rev-parse --show-toplevel`.
   It MUST be `C:/Users/KristianClifford/Projects/sammen`. If it is the
   OneDrive `Dokumenter/App` path, STOP — tell the user that copy is the stale
   preview clone and switch to `Projects\sammen`.

2. **Review what will be shipped.** `git status -s` and `git diff --stat`.
   Stage only the intended files by name. NEVER `git add -A` or `git add .`
   (risk: tools/, logs, scratch files).

3. **Validate codemagic.yaml if it changed.** Parse it before it can waste a
   full CI round:
   ```
   npx --yes js-yaml codemagic.yaml > /dev/null
   ```
   Abort on parse error and fix first. Also sanity-check: the iOS workflow must
   use `npx cap copy ios` (never `cap sync ios` — it overwrites the Podfile and
   removes the post_install deployment-target hook) and `xcode: latest`.

4. **Rebase onto the remote before pushing:**
   ```
   git pull --rebase --autostash
   ```

5. **Commit** with a descriptive English imperative message ending with:
   `Co-Authored-By: Claude <noreply@anthropic.com>` (adjust model name).

6. **Push and verify:**
   ```
   git push origin main
   git rev-list --left-right --count origin/main...HEAD   # must print: 0 0
   ```

7. **Remind the user**: Codemagic builds are started manually from the
   dashboard — pushing alone does not trigger a build.

## Failure handling

- Push rejected even after rebase → `git fetch origin` and inspect
  `git log origin/main --oneline -5` for unexpected commits; never force-push.
- Rebase conflict → resolve, `git rebase --continue`; if unsure, show the user
  the conflicting hunks before choosing.
