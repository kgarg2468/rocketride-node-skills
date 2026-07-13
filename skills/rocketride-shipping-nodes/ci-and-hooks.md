# CI and hooks — what runs and how to respond

Use this reference only after the user chose a shipping mode or explicitly asked to inspect
CI/review; it never activates PR creation.

## Local pre-commit (lefthook.yml)

Sequential: `gitleaks protect --staged`, `ruff check`, `ruff format --check` (Python files).
If the tools aren't on PATH and you commit `--no-verify`: run the equivalents manually first
(`uvx ruff check`, `uvx ruff format --check`, eyeball-scan for secrets) and disclose in the PR.

## On the PR (`.github/workflows/ci.yml`)

| Check | What | If it fails |
|---|---|---|
| `ruff-check` | `ruff check` + `ruff format --check` | run locally, fix, push |
| `gitleaks` | secret scan with `.gitleaks.toml` custom rules for `.pipe` and `services*.json` API-key fields; `$VAR`/`${VAR}` placeholders allowlisted (`[A-Z0-9_]+`) | confirm it's a placeholder false-positive vs a real secret. Real secret: rotate + rewrite history. False positive: the allowlist regex may need widening — that's a separate `chore(ci):` commit, explained to the user |
| Build / Ubuntu, Windows, macOS | compiles the C++ engine + runs `./builder test` (10–20 min) | pure-Python node code rarely breaks these; read the actual job log before assuming |
| `ci-ok` | the aggregator — the only branch-protection-required check | green when all the above are |
| CodeRabbit | auto-review, appends a summary | a reviewer, not a gate — address its comments like any review |
| auto-label, discord-notify | housekeeping | ignore |

## Reading CI correctly

- By default, treat a terminal status as green only when it is `success`. `cancelled`, `timed_out`,
  `action_required`, `stale`, and `failure` are non-green; `pending` and `queued` are unfinished.
  Treat `skipped` or `neutral` as acceptable only for an expected, non-required path.
- A red ❌ from a **previous** run sticks until the new run's same job completes — check the
  run id before declaring a failure stale.
- "Pending" is not "failed". The build matrix is slow.
- After pushing a fix, verify the **new** run picked up the right HEAD
  (`gh pr view <n> --json headRefOid`).
- Report evidence separately: local checks, CI-equivalent checks, live-vendor checks,
  live-engine checks, and canvas checks. Do not let one stand in for another.
- Report the review decision, unresolved actionable-thread count, whether
  `CHANGES_REQUESTED` remains, and which threads require reviewer resolution rather than an
  author response.

## The /loop (full close-out mode only)

With user consent, start `/loop` hourly: check `gh pr checks <n>` + new review comments; fix red
checks and address review feedback (tighten toward the established pattern — that's how #509's
driver class became `@tool_function`); report each cycle; stop when mergeable or the user says
stop.
