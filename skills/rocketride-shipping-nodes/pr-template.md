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

- [x] Tests added or updated — <N> unit + contract/service tests (`nodes/test/...`)
- [x] Tested locally — ruff clean; <N> unit+contract/service pass; <live e2e summary if run>
- [x] Docs added or updated — node README with required sections, upstream docs links, and
      `ROCKETRIDE:GENERATED:PARAMS` marker block
- [ ] `./builder nodes:docs-generate` refreshed generated docs block — <tick only if run and
      diff checked; otherwise say why not>
- [ ] `./builder nodes:test` passes — <ticked ONLY if you ran it AND it passed; otherwise an
      honest one-liner describing what actually happened>
- [ ] `./builder nodes:test-full` passes — <tick only when applicable and actually passed>
- [ ] `./builder nodes:test-contracts` passes — <tick only if actually passed>

## Checklist

- [x] Commit messages follow conventional commits
- [x] No secrets or credentials included
- [ ] Wiki updated (if applicable) — <or: node README with generated marker blocks>
- [x] Breaking changes documented (if applicable) — none (purely additive)

## Linked Issue

Closes #<issue>
```

House-style extras seen on merged node PRs (add when useful): `## Why this feature fits this
codebase` (cite the existing pattern matched), `## What changed` (file-by-file table),
`## How this could be extended`.

## Rules

- Capabilities must match the approved Gate B design and current precedent; do not add
  `"experimental"` by reflex.
- Validation claims must match reality exactly — reviewers and CI will diff them.
- Public docs claims are post-merge only: say "pending docs deploy" until
  `docs.rocketride.org/llms.txt` and `/nodes/<node>.md` have been checked.
- Shared-code changes (anything in `packages/`) must be called out explicitly with rationale,
  tests, and current precedent; never smuggle them into a node PR.
- A node-local additive diff is the default goal: node dir + `nodes/test/` + `examples/`.
- Preview the assembled title + body to the user and get approval **before** `gh pr create`;
  incorporate any edits and re-show. The PR is public the moment it's created.
