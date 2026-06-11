# Phase 0 — Locate and prepare the rocketride-server checkout

## 1. Resolve the checkout path (in order)

1. `$ROCKETRIDE_SERVER_DIR` env var, if set.
2. If the cwd is inside a rocketride-server clone (`git remote -v` mentions
   `rocketride-org/rocketride-server`), use it.
3. Bounded search: `ls -d ~/conductor/workspaces/*/rocketride-server 2>/dev/null`, then
   `find ~ -maxdepth 4 -type d -name rocketride-server 2>/dev/null | head -5`.
4. Ask the user.
5. Offer to clone: `gh repo clone rocketride-org/rocketride-server <path>`.

Record the absolute path; every later phase uses it. Call it `$REPO` below.

## 2. Staleness check (mandatory)

```bash
git -C "$REPO" fetch origin develop
git -C "$REPO" rev-list --count HEAD..origin/develop   # behind-count
```

(`git fetch` only updates remote-tracking refs — it never touches the working tree, so it is
always safe to run, even on someone else's dirty checkout.)

- If behind > 0: report the count to the user.
- If the tree is clean and on `develop`: fast-forward.
- Otherwise **do not touch the user's tree.** Read ALL reference material through git instead:
  - `git -C "$REPO" show origin/develop:<path>`
  - `git -C "$REPO" ls-tree -r --name-only origin/develop nodes/src/nodes/`

**Trust `origin/develop` — not the working tree, and not PR prose.** Merged code can differ from
its PR description (#509's body describes a `ToolsBase` driver that no longer exists).

## 3. Branching for the build

New work branches from `origin/develop`:

```bash
git -C "$REPO" switch -c feat/RR-<issue>-<short-desc> origin/develop
```

If the user's checkout is dirty, build in a worktree
(`git -C "$REPO" worktree add <dir> origin/develop`) instead of disturbing it. The branch name is
ruleset-enforced (`<type>/RR-<issue>-<desc>`); if no issue exists yet, defer branch creation —
the shipping skill creates the issue first.

## 4. Fork wiring — deferred

Do NOT set up fork remotes, run `gh auth`, or `gh repo fork` in Phase 0; read-only sessions must
never prompt for auth or mutate anything. **Read-only `gh` commands** (`gh pr list`,
`gh issue list`, `gh pr view`) are fine in any phase when `gh` is already authenticated — if it
isn't, skip them and note what you couldn't check rather than prompting.
`rocketride-node-skills:rocketride-shipping-nodes` handles fork setup at ship time.
