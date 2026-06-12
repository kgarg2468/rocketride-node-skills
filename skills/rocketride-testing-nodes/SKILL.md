---
name: rocketride-testing-nodes
description: Use when writing or running tests for a rocketride-server node, debugging contract-suite or ./builder failures, running per-phase or final e2e audits, or validating a node against a live engine or the IDE canvas
---

# Testing RocketRide Nodes

The test ladder, bottom to top. Climb as far as the environment allows; **report exactly which
rungs you climbed — never imply a rung you skipped.**

## The ladder

1. **Lint** — `uvx ruff check <node dir> <test file>` and `uvx ruff format --check …` (CI runs
   both; lefthook runs them on commit).
2. **Network-free unit tests** — `nodes/test/test_<node_name>.py` using the sys.modules stub
   pattern: `stub-test-pattern.md`. Written *during* each build phase, never after. Current bar:
   ~20+ tests (tool_v0 ships 22).
3. **Contract suite** —
   `uvx --python 3.11 --with pytest --with pytest-asyncio pytest nodes/test/test_contracts.py`
   validates every node's services.json (the whole catalog must stay green, not just your
   node). The `--with pytest-asyncio` is required: `nodes/test/conftest.py` imports it.
4. **Builder wrappers** — `./builder nodes:test`, `./builder nodes:test-contracts`.
   **Try them first** — the node-test targets often run without the C++ toolchain (verified:
   both completed on a machine with no cmake/pkg-config). Only the full `./builder test` /
   engine builds need the toolchain. **Graceful degrade:** if a builder command does fail on
   toolchain, fall back to direct pytest on the same files, and record honestly what actually
   happened — e.g. "`./builder test` failed at toolchain detection (pkg-config not found); the
   identical test files pass via direct pytest; CI runs the wrapper." Tick a `./builder test`
   checkbox ONLY if you ran it **and it passed** — "I ran it (and it failed)" does not count.
5. **Live vendor harness (optional)** — drive the node's real code against a real vendor
   instance from a script in the gitignored `.context/` dir (never in the PR). The n8n node's
   one-command `run.sh` (launch service → seed fixtures → run checks → teardown) is the model.
6. **Live engine / IDE canvas** — `live-engine.md`. Requires user participation (reload window,
   click nodes); offer it, don't claim it happened without the user.

Also fill the **services.json `test` block** (profiles/cases with placeholder API keys and a
comment that config validation, not live calls, is what's tested) — schema in
`docs/README-node-testing.md` in the checkout. Some merged nodes (tool_v0, tool_firecrawl)
ship without one — that's a gap in those nodes, not precedent; include it.
**Known carve-out:** nodes whose only input is the binary `tags` lane (document parsers —
llamaparse/reducto class). The framework can't feed binary into an inline `test` block, and zero
tags-lane manifests ship one (verified against develop, June 2026). For those nodes: skip the
block, state the exemption explicitly in the PR ("tags-lane node — the test framework can't
drive binary input; the unit suite is the gate"), and make the unit suite carry that load.

## The two audits

Defined in `e2e-audit-checklist.md`:
- **Per-phase audit** — after every build phase, scoped to that phase's changes.
- **Final massive e2e** — once all phases pass, the full merge-readiness pass.

## Red flags

| Thought | Reality |
|---|---|
| "pytest passed, so I'll say `./builder test` passes" | Different command. Say what you ran. |
| "I *ran* the builder (it failed), so I can tick the box" | The box says *passes*. Ran-and-failed = unticked + what happened |
| "My node's tests pass, contract suite is someone else's problem" | Your services.json can break the catalog — run the full contract suite |
| "Live test needs credentials, mark it passing anyway" | `pytest.mark.skip` + say in the PR it's not claimed as passing |

## Supporting files

- `stub-test-pattern.md` — the canonical no-network test recipe
- `e2e-audit-checklist.md` — per-phase + final checklists
- `live-engine.md` — engine bundle sync + reload procedure, live-vendor harness pattern
- `sync-node-to-engine.sh` — copies a node into the local engine bundle
