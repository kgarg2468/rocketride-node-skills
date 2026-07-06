# RocketRide node toolkit v2 — demo

A working demonstration of the architecture the adversarial debate converged on: **deterministic
codegen for the mechanical half + a thin judgment skill for the rest**, replacing the v1 set of 13
prose skills that rot against a fast-moving upstream.

> Status: standalone demo (not yet landed in-tree — that decision is open). Everything below runs
> today against a throwaway `origin/develop` checkout, with **zero LLM calls and zero network**.

---

## The problem v2 fixes (all verified against `origin/develop`)

- **v1 was 13 skills / ~1,355 lines** of prose with **~198 hardcoded couplings** to server internals.
  They rot silently: the DB skill points at `db_postgres/db_global_base.py:66`, but that class moved
  to `packages/ai/src/ai/common/database/` — a node author following the skill is sent to a dead path.
- **`services.json` rules are restated in ~16–19 skill files** — one schema change = 16–19 edits.
- **5 clones at 5 commits**; even the "live" symlinked clone lagged the canonical one, so a careful
  reader concluded a finished benchmark was unfinished. Staleness is the core enemy.

## The v2 shape

| Tier | What | Where | Rots? |
|---|---|---|---|
| 1 | ~40-line always-on discipline (gates, `origin/develop` rule, exemplars + negative-knowledge) | `AGENTS-node-block.md` → `AGENTS.md` | barely |
| 2 | **One** dispatched judgment skill (gate flow + archetype dispatch table) | `rocketride-building-nodes/SKILL.md` | slowly |
| 3 | **Deterministic generator** — the mechanical 30–70% | `generator/new-node.mjs` (→ `builder nodes:new`) | **can't** (regenerated, CI-verified) |
| + | Vendor-drift tracker (no LLM) | `generator/node-ops-diff.mjs` | n/a |

The mechanical knowledge (file layout, base-class wiring, `services.json` shape) moved **out of prose
the model re-derives** and **into a generator the contract suite verifies**. That kills the
duplication tax and the silent rot in one move.

---

## Run it

```bash
# 0. throwaway origin/develop checkout + a venv with pytest (proof target)
git -C <rocketride-server> worktree add --detach /tmp/rr-v2-dev origin/develop
uv venv /tmp/cvenv --python 3.12 && uv pip install --python /tmp/cvenv/bin/python pytest pytest-asyncio

G=generator/new-node.mjs

# 1. scaffold one node per archetype (deterministic; emits 8 files each + node-ops.json)
node $G --archetype tool      --vendor acmesearch --title AcmeSearch --out /tmp/rr-v2-dev
node $G --archetype llm       --vendor zephyr     --title Zephyr     --out /tmp/rr-v2-dev
node $G --archetype processor --vendor wordstats  --title WordStats  --out /tmp/rr-v2-dev
node $G --archetype database  --vendor duckdb     --title DuckDB     --out /tmp/rr-v2-dev
# hosted flavor = variant, NOT a new node:
node $G --archetype database  --vendor neon --title Neon --variant-of db_duckdb --out /tmp/rr-v2-dev
```

### Proof 1 — generated nodes pass the **real** upstream contract suite

```bash
cd /tmp/rr-v2-dev && /tmp/cvenv/bin/python -m pytest nodes/test/test_contracts.py \
  -k "tool_acmesearch or llm_zephyr or wordstats or db_duckdb or neon" -q
```
```
10 passed, 274 deselected
```
The generator's output satisfies `nodes/test/test_contracts.py` (title/protocol/node-type, `__init__`
present, valid lane names) on the first run — no hand-fixing.

### Proof 2 — the generator-emitted unit stubs run

```bash
/tmp/cvenv/bin/python -m pytest nodes/test/test_{tool_acmesearch,llm_zephyr,wordstats,db_duckdb}.py -q --noconftest
```
```
4 passed
```
Each scaffolded node ships a network-free test that imports the generated Python and asserts a real
behavior (e.g. missing-param raises) — using the repo's own package-stub loader pattern.

### Proof 3 — vendor-drift tracker (the release-tracker, done right)

A "matured" `tool_acmesearch` supports `search`+`lookup`; the vendor's OpenAPI just added `summarize`:

```bash
node generator/node-ops-diff.mjs \
  --node-ops generator/examples/acmesearch.node-ops.json \
  --openapi  generator/examples/acmesearch.openapi.json --open-draft
```
```
node-ops-diff: tool_acmesearch  (vendor: AcmeSearch)
  supported operations : search, lookup
  vendor OpenAPI v2024-06, 3 operations
  ⚠ api_version drift: node says "2024-01", vendor is "2024-06"
  1 vendor operation(s) NOT yet supported:
    - summarize  (Summarize a URL or document (added 2024-06))
  Draft PR this would open (draft-only, never auto-merge):
    title: chore(tool_acmesearch): vendor added 1 operation(s) (2024-06)
exit code: 1   # signals drift — usable as a scheduled GitHub Action / CI gate
```
Pure mechanical diffing → **no LLM, no self-approval risk, draft-only as a hard default.** This is the
debate's verdict: the release tracker is a script, not a headless agent.

---

## What this demonstrates

- **Determinism beats prose for the mechanical half.** 8 files/archetype, correct base-class imports,
  `experimental` always set, README markers present — generated, not re-typed, and CI-verified.
- **The duplication + rot tax is gone** for the generated surface: one template per archetype, not a
  rule restated in 16–19 skill files.
- **Judgment stays with the model** (Gate A scope, operation selection, request/response shaping) —
  the generator leaves clearly-marked TODOs.
- **$0 to verify.** No metered model calls anywhere in the generator or the differ.

## Honest scope / what's next

- Generator templates cover **tool, llm, processor, database** (+ hosted-flavor variants). embedding /
  vector-store / ingress / agent are the same pattern — each is one more template (a follow-on PR).
- The Tier-1 block + Tier-2 skill are **drafted here**; landing them in-tree (and wiring `nodes:new`
  into `nodes/scripts/tasks.js` + a CI anchor-freshness check) is the in-tree adoption step, which is
  a separate decision (where this lives is still open).
- The contract suite's *instantiate* tests need the engine; this demo proves the **structural**
  contract (what `nodes:test-contracts` gates) without a 2.3 GB build.
