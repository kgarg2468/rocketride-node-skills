---
name: rocketride-testing-nodes
description: Use when writing or running tests for a rocketride-server node, debugging contract-suite or ./builder failures, running per-phase or final e2e audits, or validating a node against a live engine or the IDE canvas
---

# Testing RocketRide Nodes

The test ladder, bottom to top. Climb as far as the environment allows; **report exactly which
rungs you climbed — never imply a rung you skipped.**

## The ladder

1. **Lint** — `uvx ruff check <node dir> <test path>` and `uvx ruff format --check ...` (CI runs
   both; lefthook runs them on commit).
2. **Network-free unit tests** — use the sys.modules stub pattern (`stub-test-pattern.md`) in a
   path that matches the package shape: `nodes/test/test_<node>.py` for simple nodes, or nested
   packages like `nodes/test/<node>/<service>/test_<service>.py` for multi-service nodes.
   Written *during* each build phase, never after. Match the breadth of the reference node; do
   not claim a magic required test count.
3. **Contract suite** —
   `uvx --python 3.11 --with pytest --with pytest-asyncio pytest nodes/test/test_contracts.py`
   validates every node's services.json (the whole catalog must stay green, not just your
   node). The `--with pytest-asyncio` is required: `nodes/test/conftest.py` imports it.
4. **Server-backed builder node tests** — prefer the current wrappers:
   `./builder nodes:test`, `./builder nodes:test-full`, and `./builder nodes:test-contracts`.
   `nodes:test` runs service tests and skips heavy/full cases; `nodes:test-full` includes cases
   marked for full/live/heavy coverage. These are not the same as full `./builder test`. Tick a
   builder checkbox only for the exact command you ran **and** that passed; if you fall back to
   direct pytest, say so plainly.
5. **Direct tool invocation (tool nodes)** — when the node exposes `@tool_function` methods, use
   the current DAP/tool invocation path if available to call the tool surface directly after
   unit tests and before live canvas checks.
6. **Live vendor harness (optional)** — drive the node's real code against a real vendor
   instance from a script in the gitignored `.context/` dir (never in the PR). The n8n node's
   one-command `run.sh` (launch service → seed fixtures → run checks → teardown) is the model.
7. **Live engine / IDE canvas** — `live-engine.md`. Requires user participation (reload window,
   click nodes); offer it, don't claim it happened without the user.

Fill the **services.json `test` block** when the framework can drive the node. Current schema is
in `docs/README-node-testing.md` and supports `requires`, `requiresLibs`, `profiles`,
`controls`, `chain`, `outputs`, `timeout`, and `cases`. Use:

- `fulltest: true` for live/heavy/slow cases that should run only under `./builder nodes:test-full`.
- `requiresLibs` when import-time/runtime libraries gate the test; the pytest harness skips
  honestly when they are unavailable.
- `avoidMocks` when a node must not receive LLM/tool mock credentials.
- File-path lanes for image/audio/video/document inputs when needed; inline lanes for text,
  questions, answers, table, classifications, and tags.

Some current nodes omit service-level test blocks because the framework cannot realistically
drive them yet (binary/parser-only cases, database services without useful mocks, or heavyweight
model nodes). Treat omissions as an explicit decision: document why the service block is omitted
and make unit, contract, and any live harness coverage carry that risk.

## Trigger-to-test map

Use the risk/effect map from `rocketride-planning-nodes/mockup-template.md` to select rows.

| Trigger | Test proof |
|---|---|
| State refresh or commit | Normal success; repeated call after partial/incomplete state; commit only after meaningful success |
| External success response | Complete, missing-meaningful-field, and malformed-meaningful-field responses |
| Config aliases | Canonical, supported alternate, conflicting, and invalid forms |
| Retryable vs permanent failure | Retryable failure then success; permanent failure without retry; no duplicate committed side effect |
| Cursor/continuation | Continue within the original query, filter, tenant, and page scope |
| Protected outcome | Exercise every mutation route; denied paths make zero vendor calls and persist zero mutation |
| Exact user content | Preserve authored content exactly; normalize only permitted identifiers |
| Collection semantics | Cover absent, empty, and nonempty collections as distinct cases |
| Optional dependency | Check the CI-equivalent optional-dependency path and its minimum supported version |

## The two audits

Defined in `e2e-audit-checklist.md`:
- **Per-phase audit** — after every build phase, scoped to that phase's changes.
- **Final massive e2e** — once all phases pass, the full merge-readiness pass. Includes the
  **ship-ready UX gate** (icon/logo, discoverability, config panel, canvas) so the node is polished
  for outside users, not just green on tests.

## Red flags

| Thought | Reality |
|---|---|
| "pytest passed, so I'll say `./builder nodes:test` passes" | Different command. Say what you ran. |
| "I *ran* the builder (it failed), so I can tick the box" | The box says *passes*. Ran-and-failed = unticked + what happened |
| "My node's tests pass, contract suite is someone else's problem" | Your services.json can break the catalog — run the full contract suite |
| "Live test needs credentials, mark it passing anyway" | `pytest.mark.skip` + say in the PR it's not claimed as passing |

## Supporting files

- `stub-test-pattern.md` — the canonical no-network test recipe
- `e2e-audit-checklist.md` — per-phase + final checklists
- `live-engine.md` — `local_nodes`/`--node_path`, engine bundle sync fallback, live-vendor harness pattern
- `sync-node-to-engine.sh` — copies a node into the local engine bundle
