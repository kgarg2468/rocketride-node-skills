---
name: rocketride-shipping-nodes
description: Use when a rocketride-server node is built and verified and needs an issue, branch, commits, or PR — or when deciding how far to take a finished node, monitoring its CI, or responding to review
---

# Shipping RocketRide Nodes

Only enter after the final massive e2e passes. First action: **ask the user which close-out mode**
(multiple choice) — never assume:

1. **Full close-out** — issue → branch → commit → push to fork → PR → `/loop` monitoring CI +
   review comments (hourly) until mergeable
2. **PR only** — open the PR, stop
3. **Draft PR only**
4. **Local branch only** — commit, no push

## The sequence (for modes 1–3)

1. **Issue first.** Every node PR links an issue. Search for an existing one
   (`gh issue list --repo rocketride-org/rocketride-server --search "<vendor>"`); if none
   (internally-assigned work often has none), create one with the feature template and tell the
   user. The issue number drives the branch name.
2. **Branch** — ruleset-enforced: `feat/RR-<issue>-<short-desc>`, cut from `origin/develop`.
   Non-conforming names are **rejected on push**.
3. **Commit** — conventional commits: `feat(nodes): add <x> node`. Body summarizes surface +
   patterns matched + test counts. If lefthook's tools aren't on PATH and you must
   `--no-verify`, say so in the PR and confirm ruff/gitleaks were run manually.
4. **Push** — check `git remote -v`: most contributors lack org write access (push will 403).
   Push to the user's fork (`gh repo fork --remote` if absent) and open a cross-repo PR.
5. **PR — draft, preview, approve, then create.** Assemble the PR: base `develop` (NOT main),
   title = the commit subject, body = `pr-template.md`. **Honest checkboxes**: only tick
   `./builder nodes:test`, `./builder nodes:test-full`, or `./builder nodes:test-contracts` if you
   ran that exact command **and** it passed; otherwise leave unticked with a one-liner saying
   exactly what happened (not run / ran-but-failed / etc.). Then **show the full title + body to the
   user as a preview and wait for approval** — a dismissed or unanswered dialog is a STOP, not
   consent. Incorporate any requested edits and re-show. Only after the user approves do you run
   `gh pr create` (through the user's fork); use `--draft` when the user chose mode 3.
6. **CI** — see `ci-and-hooks.md`. After opening, check the first run; for mode 1 start a
   `/loop` (hourly) watching checks + review comments (CodeRabbit + maintainers), addressing
   feedback by tightening the pattern.
7. **After merge/docs deploy** — verify the public docs and LLM surface when applicable:
   `https://docs.rocketride.org/llms.txt` lists the node, and
   `https://docs.rocketride.org/nodes/<node>.md` renders the README with generated schema.
   If not yet deployed, record it as pending instead of claiming public docs are live.

## Red flags

| Thought | Reality |
|---|---|
| "No issue exists, skip the link" | CI requires it; create one |
| "Push to origin directly" | 403 for most; fork workflow is the norm |
| "Tick all the boxes, it's basically tested" | Unticked + honest note beats a false claim — reviewers diff your claims against CI |
| "Describe what I meant to build" | Describe what the diff contains |
| "Approved the build, so I can open the PR" | The PR title + body are their own approval: preview them and wait before `gh pr create` |

## Supporting files

- `pr-template.md` — exact PR body format + branch/commit conventions
- `ci-and-hooks.md` — what runs on the PR and how to respond to each failure
