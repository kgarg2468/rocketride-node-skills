---
name: rocketride-building-nodes
description: Use when asked to build, create, add, or port a node or integration for rocketride-server (e.g. "build a DeepL node", "add an Apify integration"), or when starting any new-node work from just a service name
---

# Building RocketRide Nodes

Master workflow: a node name in, a verified, conventions-compliant node out. Follow the phases in
order. The gates are **hard stops** — present to the user and wait. Gate 0 fires only when the
integration shouldn't be a fresh node; Gates A–D always fire.

**Waiting means ENDING YOUR TURN.** A dismissed question dialog, an unanswered question, or a
non-interactive/headless session is a STOP, never an approval. No exceptions:
- Don't "proceed with the recommended defaults" — a recommendation is not a confirmation.
- Don't treat silence, dismissal, or the absence of a user as consent.
- Don't later write "scope was confirmed at Gate X" unless a human actually answered.
If nobody can answer, deliver the gate brief as your final message and stop — an unbuilt node
costs nothing; an unapproved one wastes the build and the review.

## Phases

0. **Locate the repo** — follow `repo-setup.md`. Mandatory staleness check; read reference
   material from `origin/develop`, never trust a stale working tree.
1. **Research** — REQUIRED SUB-SKILL: `rocketride-researching-nodes`. Light dual research for
   clones of an existing archetype; full multi-agent deep research only for novel/complex nodes.
   Research also classifies the **integration pathway** (`integration-pathways.md`).
2. **GATE 0 — pathway.** Research classifies the integration pathway (`integration-pathways.md`
   in `rocketride-researching-nodes`): existing node / preset-variant / MCP bridge
   (`tool_mcp_client`) / Python wrap (`tool_python`) / fresh node. **If the recommended pathway is
   NOT a fresh node**, this is a hard stop — present the alternative with its tradeoffs and your
   recommendation, and **do not scaffold**; a non-node pathway means hand off. **If the
   recommendation IS a fresh node** (rungs 1–4 don't fit), don't add a separate stop: state the
   one-line pathway rationale as the first line of Gate A. Advisory: if the user rejects a
   non-node recommendation and still wants a fresh node, continue to Gate A.
   > PR #1063 built an MCP-client clone when the ask was a Supabase **DB** node — the correct
   > answer was a `db_postgres` variant (`services.supabase.json`). Wrong pathway = total rework.
   > This is the gate that catches it.
3. **GATE A — archetype confirmation.** Present: the pathway rationale (why a fresh node — which
   rungs 1–4 you rejected, per Gate 0), the detected archetype, the 1–2 reference nodes you
   will clone/triangulate, the vendor's **complete operation menu** (every operation by name,
   partitioned proposed / deferred / out-of-scope with reasons, closed by the count line
   "Menu complete: N operations, verified against <source>" — the user decides scope from the
   full menu, never from a pre-pruned one), and what the node will NOT be. Run the archetype
   check **per operation**: if any operation is agent-tool-shaped while the rest are data-flow,
   surface the dual-classType option here (`archetype-map.md`), even if the MVP excludes that
   operation. Then load the matching archetype skill via `archetype-map.md`.
4. **Mockup + blast radius + design questions** — REQUIRED SUB-SKILL: `rocketride-planning-nodes`.
   Ask the archetype's key **design questions** (`design-questions.md`) as options + a recommended
   default before drawing the mockup, and record the answers. Anything needed outside
   `nodes/src/nodes/<name>/`, `nodes/test/`, and `examples/` is a blast-radius flag. Co-located
   node `README.md` is part of the node package; `doc.md` is legacy/supplementary, not required.
   Changes to `packages/` or other shared code require an explicit Gate B/C blast-radius section
   with PR evidence, tests, and a separate phase. They may be legitimate (recent nodes have needed
   reviewed shared helpers), but never do them silently.
5. **GATE B — user approves the mockup + recorded design decisions + blast radius.**
6. **Phased plan** — phases sized to complexity (provider clone: 1–2; agent node: 5+). Every
   phase ends with the per-phase e2e audit, not just "tests pass".
7. **GATE C — user approves the plan.** For a 1–2-phase clone of an existing archetype, B and C
   may be presented together as one combined gate (mockup + plan, one approval) — say explicitly
   that you're combining them. Gate A is never skipped or silently combined; Gate 0 is a separate
   stop only when it diverts from building a fresh node.
8. **Build, phase by phase** — tests written *inside* each phase, never after. After each phase
   run the per-phase audit from `rocketride-testing-nodes`; loop until it passes before moving on.
9. **Final massive e2e** — the full checklist in `rocketride-testing-nodes`
   (e2e-audit-checklist.md), including the **ship-ready UX gate** (icon/logo, canvas display),
   plus a self code review of the diff.
10. **GATE D — local handoff by default.** Present the validation summary and any checks not run,
   then stop. Do not ask for a shipping mode or activate shipping unless the user explicitly asks
   to ship or close out the node, create an issue/branch/commit, push, open a PR, monitor CI, or
   address review. When asked, use `rocketride-shipping-nodes`; never auto-start the loop.

## Red flags

| Thought | Reality |
|---|---|
| "This is obviously a tool node, skip Gate A" | #1063 was "obvious" and built the wrong node type entirely |
| "It's an API, so it's obviously a new tool node — scaffold it" | Rungs 1–4 come first (`integration-pathways.md`): the vendor may ship an MCP server (`tool_mcp_client`) or be a flavor of an engine we already speak. Gate 0 decides before Gate A |
| "I researched that op but it doesn't fit the MVP, leave it off the menu" | Research-then-prune is the landing.ai failure. Every researched op goes on the menu (deferred/out-of-scope is fine); the count line makes omissions visible |
| "The question was dismissed / nobody answered, so I'll proceed with defaults" | Dismissed = unanswered = STOP. Present the gate brief as your final message and end your turn |
| "The local clone is fine, no need to fetch" | The source guide for this skill was written on a clone 18 commits stale; develop moves fast |
| "I'll add tests at the end" | Tests are written inside each build phase, never after |
| "Tick the `./builder nodes:test` checkbox, pytest passed" | Only tick what you actually ran; state plainly what you did not run |
| "Small fix needed in `packages/ai`, I'll just do it" | Core/shared changes need an explicit blast-radius gate, PR evidence, tests, and a separate phase |
| "The PR prose can describe the design" | Describe the merged code, not intentions — #509's body describes a class that no longer exists |

## Supporting files

- `repo-setup.md` — locate/clone the checkout, staleness protocol, branching
- `archetype-map.md` — integration type → archetype → skill dispatch table
- `gotchas.md` — cross-cutting traps every phase must respect
- `node-ops-spec.md` — future watcher spec only; do not implement during normal node builds
