# PR formatting (house style)

## Branch

```
feat/RR-<issue>-<short-desc>        # e.g. feat/RR-1230-n8n-node
```

Cut from `origin/develop`. Ruleset-enforced; wrong names are rejected on push. Other types:
`fix/`, `docs/`, `refactor/`, `chore/` — same `RR-<issue>` infix.

## Commit message

```
feat(nodes): add <vendor> <what> node

Add `<node_name>`, a <archetype> node that <one-line>. Mirrors <reference node(s)>
(<which pattern matched>).

- <surface bullet>
- <safety/DX bullet>
- <docs/examples bullet>

Tests: <N> unit + contract tests; <live verification one-liner, honest>.
```

## PR body — fills the repo's PULL_REQUEST_TEMPLATE.md

```markdown
## Summary

- Add `<node_name>` — <archetype + one-line> (mirrors `<reference>`).
- <key capability bullet>
- <safety/DX bullet>

## Type

feature (new pipeline/agent-tool node) + docs + tests

## Testing

- [x] Tests added or updated — <N> unit + contract tests (`nodes/test/test_<name>.py`)
- [x] Tested locally — ruff clean; <N> unit+contract pass; <live e2e summary if run>
- [ ] `./builder test` passes — <ticked ONLY if you ran it AND it passed; otherwise an honest
      one-liner describing what actually happened, e.g. "couldn't run the C++ builder locally
      (toolchain not installed); the identical test_contracts.py passes via pytest; CI runs
      the wrapper" — adapt it if the builder ran but failed>

## Checklist

- [x] Commit messages follow conventional commits
- [x] No secrets or credentials included
- [ ] Wiki updated (if applicable) — <or: docs added at docs/README-<x>.md + node README>
- [x] Breaking changes documented (if applicable) — none (purely additive)

## Linked Issue

Closes #<issue>
```

House-style extras seen on merged node PRs (add when useful): `## Why this feature fits this
codebase` (cite the existing pattern matched), `## What changed` (file-by-file table),
`## How this could be extended`.

## Rules

- Mark the node `"experimental"` in capabilities.
- Validation claims must match reality exactly — reviewers and CI will diff them.
- Core-change suggestions (anything in `packages/`) go in a PR comment or the issue as a pitch
  for eng — never smuggled into the node PR.
- A purely-additive diff is the goal: node dir + `nodes/test/` + `examples/` + `docs/`.
