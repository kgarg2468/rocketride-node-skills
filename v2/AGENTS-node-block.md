<!--
TIER 1 — always-on node-building block.
Paste this into rocketride-server's AGENTS.md (and/or .claude/CLAUDE.md) under a
"## Building a node" heading. It is intentionally ~40 lines: it loads on EVERY
task, so it carries only the irreducible discipline + pointers. The full flow
lives in the dispatched `rocketride-building-nodes` skill; the mechanical
scaffold lives in `builder nodes:new`.
-->
## Building a node

To add or change a node (`nodes/src/nodes/<name>/`), use the deterministic scaffolder and the
node-building skill — do not hand-assemble boilerplate or copy a whole existing node by eye.

**Scaffold first (deterministic):** `builder nodes:new --archetype <tool|llm|processor|database> --vendor <name> --title <Title>`.
It emits the correct file layout, license headers, `services.json` skeleton, base-class wiring,
a network-free test stub, a `README.md` with the `ROCKETRIDE:GENERATED:PARAMS` markers, and
`node-ops.json`. Then fill the TODOs — that is the judgment work. Verify with
`builder nodes:test-contracts`.

**Trust `origin/develop`, never the local working tree.** Read reference nodes and base classes
via `git show origin/develop:<path>`; a checked-out branch may be stale. Counts, paths, and line
numbers drift — resolve them live, don't memorize them.

**Gates are hard stops. Waiting means ENDING YOUR TURN.** A dismissed dialog, an unanswered
question, or a headless session is a STOP, never an approval. Never "proceed with the recommended
defaults"; never write "scope was confirmed" unless a human answered. An unbuilt node costs
nothing; an unapproved one wastes the build and the review.

**At Gate A, present the COMPLETE operation menu** — every vendor operation by name, partitioned
proposed / deferred / out-of-scope, closed by "Menu complete: N operations, verified against
<source>". The user picks scope from the full menu, never a pre-pruned one.

**Canonical exemplars** (read live; clone the shape, not the bugs):
- tool → `tool_v0` (raise on error). Do **NOT** copy `tool_tavily`/`tool_firecrawl` `{success: False}`
  error dicts — that style is grandfathered; the framework wants raised exceptions.
- llm → `llm_anthropic` (`IInstance(LLMBase)` from `ai.common.llm_base`; `IGlobal` composes `ChatBase`).
- processor → `anomaly_detector` (lane handlers, helper module).
- database → `db_postgres` (`from ai.common.database import DatabaseGlobalBase`; a hosted flavor like
  Supabase/Neon is a `services.<flavor>.json` variant, **not** a new node — `nodes:new --variant-of`).

**Every new node ships `"experimental"` in `capabilities`.** Core changes (`packages/`) are written
suggestions for a human, never edited unilaterally.

For the full lifecycle (research → Gate A → mockup/blast-radius → plan → phased build with per-phase
e2e → final e2e → ship), use the `rocketride-building-nodes` skill.
