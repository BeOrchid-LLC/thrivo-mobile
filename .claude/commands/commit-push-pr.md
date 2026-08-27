---
description: Commit the current work, push the branch, and open a PR against the given base branch
argument-hint: [base-branch]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(gh pr:*), Bash(gh repo:*), Bash(npm run:*), Read, Write, Edit
---

Ship the current branch: commit what's outstanding, push it, and open a pull
request against **`$1`** (when no argument is given, default to `staging`).

Follow the steps in order. Stop and report if a step fails — do not skip ahead,
and do not paper over a failure to get to the PR.

## 1. Establish the state

Run these together and read the results before doing anything else:

```bash
git branch --show-current
git status --short
git diff --stat HEAD
git log --oneline origin/$1..HEAD 2>/dev/null | head -30
```

Also check `.git/MERGE_HEAD` — if it exists, a merge is in progress and step 3
commits *that* merge rather than authoring a fresh commit.

**Refuse to continue** if the current branch is `main` or `staging`: CLAUDE.md
forbids committing to them directly. Say so, offer to create a feature branch
from the current work, and stop.

**Refuse to continue** if the current branch and `$1` are the same branch — a PR
needs two distinct refs.

If there is nothing to commit *and* nothing unpushed, skip to step 5 and just
report the existing PR (or offer to open one for the already-pushed commits).

## 2. Run the checks

```bash
npm run checks
```

This is `typecheck`, `lint`, `format:check`, and `check:no-raw-hex`. It must pass
for the files you touched before a PR is opened.

If it fails: fix what your own changes broke, then re-run. If the failure is
pre-existing on the base branch and unrelated to this work, say so explicitly
with the output and ask whether to proceed anyway — never silently ignore it.

Then run `npm test` and report the result the same way.

## 3. Commit

**If a merge is in progress** (`.git/MERGE_HEAD` exists): verify no conflict
markers remain (`grep -rn '^<<<<<<<' src app docs`), confirm everything is
staged, and commit the merge with its prepared message plus a short summary of
how each conflict was resolved.

**Otherwise**: stage the relevant files and write a [conventional
commit](https://www.conventionalcommits.org) — `feat(scope): …`, `fix(scope): …`,
`docs(scope): …`, `chore(scope): …`. Scope is the area touched (`mobile`, `ui`,
`onboarding`, `settings`, `boot`, …).

The subject line says what changed; the body says *why*, when that isn't obvious
from the diff. Do not stage unrelated files that happen to be dirty — CLAUDE.md
is one concern per PR. If the working tree mixes concerns, list them and ask
which belong in this commit.

End the commit message with:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## 4. Push

```bash
git push -u origin HEAD
```

Never `--force` or `--force-with-lease` unless the user explicitly asks for it in
this conversation.

## 5. Open the PR

First check whether one is already open for this branch:

```bash
gh pr view --json url,state,baseRefName
```

- **A PR already exists** targeting `$1` — the push updated it. Report its URL
  and state; do not open a second one.
- **A PR exists with a different base** — report that mismatch and ask before
  retargeting with `gh pr edit --base $1`.
- **No PR** — create one:

```bash
gh pr create --base $1 --title "<title>" --body "<body>"
```

Title: the same summary style as the commit subject, without the conventional
prefix if the PR spans several commits.

Body structure:

```markdown
## What

<one paragraph: what this changes and why it's needed>

## Notes

<judgment calls, trade-offs, anything a reviewer would otherwise have to
reverse-engineer from the diff — omit the section if there's nothing to say>

## Verification

<the actual results: `npm run checks` clean, `npm test` N/N passing, plus
anything exercised on a device or simulator>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 6. Report

Give the user the PR URL, the base branch, the commit subject, and the check
results in a few lines. If `gh pr create` reports merge conflicts against `$1`,
say so plainly and offer to merge `$1` in and resolve them.
