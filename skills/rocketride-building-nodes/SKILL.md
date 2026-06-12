---
name: rocketride-building-nodes
description: Use when asked to build, create, add, or port a node or integration for rocketride-server (e.g. "build a DeepL node", "add an Apify integration"), or when starting any new-node work from just a service name
---

# Building RocketRide Nodes

Master workflow: a node name in, a shipped, conventions-compliant node out. Follow the phases in
order. The four gates are **hard stops** — present to the user and wait.

## Phases

0. **Locate the repo** — follow `repo-setup.md`. Mandatory staleness check; read reference
   material from `origin/develop`, never trust a stale working tree.
1. **Research** — REQUIRED SUB-SKILL: `rocketride-researching-nodes`. Light dual research for
   clones of an existing archetype; full multi-agent deep research only for novel/complex nodes.
2. **GATE A — archetype confirmation.** Present: detected archetype, the 1–2 reference nodes you
   will clone/triangulate, the vendor's **complete operation menu** (every operation by name,
   partitioned proposed / deferred / out-of-scope with reasons, closed by the count line
   "Menu complete: N operations, verified against <source>" — the user decides scope from the
   full menu, never from a pre-pruned one), and what the node will NOT be. Run the archetype
   check **per operation**: if any operation is agent-tool-shaped while the rest are data-flow,
   surface the dual-classType option here (`archetype-map.md`), even if the MVP excludes that
   operation. If research found the node (or a
   variant/preset of it) **already exists**, Gate A becomes: show the evidence and ask what's
   needed beyond it — zero code may be the fastest path. Wait for user confirmation.
   > PR #1063 built an MCP-client clone when the ask was a Supabase **DB** node — the correct
   > answer was a `db_postgres` variant (`services.supabase.json`). Wrong archetype = total
   > rework. Confirm with the user, even when you are sure.
   Then load the matching archetype skill via `archetype-map.md`.
3. **Mockup + blast radius** — REQUIRED SUB-SKILL: `rocketride-planning-nodes`. Anything needed
   outside `nodes/src/nodes/<name>/`, `nodes/test/`, `examples/`, `docs/` is a blast-radius flag.
   Changes to `packages/` (core) become a **written suggestion for the user — never edit core
   unilaterally**.
4. **GATE B — user approves the mockup + blast radius.**
5. **Phased plan** — phases sized to complexity (provider clone: 1–2; agent node: 5+). Every
   phase ends with the per-phase e2e audit, not just "tests pass".
6. **GATE C — user approves the plan.** For a 1–2-phase clone of an existing archetype, B and C
   may be presented together as one combined gate (mockup + plan, one approval) — say explicitly
   that you're combining them. Gate A is never combined with anything, and no gate is ever
   skipped silently.
7. **Build, phase by phase** — tests written *inside* each phase, never after. After each phase
   run the per-phase audit from `rocketride-testing-nodes`; loop until it passes before moving on.
8. **Final massive e2e** — the full checklist in
   `rocketride-testing-nodes` (e2e-audit-checklist.md), plus a self code review of the diff.
9. **GATE D — ask the user how to close out** (multiple choice): full close-out (issue → branch →
   PR → `/loop` CI/review monitoring), PR only, draft PR only, or local branch only. Never assume;
   never auto-start the loop. Then REQUIRED SUB-SKILL: `rocketride-shipping-nodes`.

## Red flags

| Thought | Reality |
|---|---|
| "This is obviously a tool node, skip Gate A" | #1063 was "obvious" and built the wrong node type entirely |
| "I researched that op but it doesn't fit the MVP, leave it off the menu" | Research-then-prune is the landing.ai failure. Every researched op goes on the menu (deferred/out-of-scope is fine); the count line makes omissions visible |
| "The local clone is fine, no need to fetch" | The source guide for this skill was written on a clone 18 commits stale; develop moves fast |
| "I'll add tests at the end" | Tests are written inside each build phase, never after |
| "Tick the `./builder test` checkbox, pytest passed" | Only tick what you actually ran; state plainly what you did not run |
| "Small fix needed in `packages/ai`, I'll just do it" | Core changes are written suggestions for the user, always |
| "The PR prose can describe the design" | Describe the merged code, not intentions — #509's body describes a class that no longer exists |

## Supporting files

- `repo-setup.md` — locate/clone the checkout, staleness protocol, branching
- `archetype-map.md` — integration type → archetype → skill dispatch table
- `gotchas.md` — cross-cutting traps every phase must respect
