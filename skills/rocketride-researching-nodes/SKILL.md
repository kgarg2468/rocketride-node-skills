---
name: rocketride-researching-nodes
description: Use when starting research for a new rocketride-server node — understanding a vendor's API/auth/SDK, finding internal precedent in nodes/src/nodes/, or deciding how deep to research before designing
---

# Researching RocketRide Nodes

Input is often nothing more than a service name. Research runs in **two directions at once**;
the internal scan matters as much as the external one — it grounds the build in existing
patterns instead of inventing from scratch.

## 0. Does it already exist? (before anything else)

```bash
git -C "$REPO" ls-tree -d --name-only origin/develop:nodes/src/nodes | grep -i <vendor>
git -C "$REPO" grep -il '<vendor>' origin/develop -- 'nodes/src/nodes/*/services*.json'
gh pr list --repo rocketride-org/rocketride-server --search "<vendor>" --state all
```

Nodes hide under different names (Kimi = `llm_kimi`, Tavily = `tool_tavily`, Supabase =
`db_postgres/services.supabase.json`). Closed PRs tell you why previous attempts died. If it
exists, Gate A becomes "show the evidence, ask what's needed beyond it."

## 1. Triage the depth first

| Signal | Depth |
|---|---|
| Clone of an existing archetype (another LLM provider, another REST tool, another SQL DB) | **Light** — one pass each direction, ~30 min |
| Novel archetype, multi-feature surface, OAuth/streaming/stateful protocol, "make it outstanding", or strategic integration | **Deep** — multi-agent research (parallel subagents: how users use the vendor, how RR pipelines are used, best use-cases, adversarial verification of recommendations) |

When unsure, start light; escalate if the mockup phase keeps hitting unknowns. Deep research is
expensive — reserve it for nodes where the design space is genuinely open.

## 2. External: what is this thing?

- The vendor's **published API spec** (OpenAPI if available) — endpoints, request/response
  shapes, error bodies. Ground in the spec, not memory.
- Auth model: API key? OAuth2 (token refresh = extra complexity)? Self-hosted base URL?
- Rate limits, pagination, payload size limits, sync vs async patterns.
- The vendor's **complete operation inventory** — every operation/endpoint group, by name, from
  the published spec. Names only; cheap to gather, and Gate A needs it (see §4). A pruned list
  presented at a gate reads as "this is everything" — the landing.ai run surfaced 3 of ADE's 5
  operations and the user confirmed scope without ever seeing Classify or Section.
- What users actually use it for (their docs/templates/community) — this drives which 2–5
  operations the node should **expose**. Expose 2–5; **inventory all**. The cut is a Gate A
  decision the user makes from the full menu, not a research-phase prune.
- Self-hostable vendors: assume users run it on localhost/Docker — don't reject private URLs;
  plan deploy-aware reachability hints (`host.docker.internal`).

## 3. Internal: what do we already have?

Follow `internal-scan.md`. Output: the closest existing node(s), the archetype, and prior art
worth copying. **Read reference material from `origin/develop`** (`git show`), not the working
tree.

## 4. Output (feeds Gate A)

A short brief: what the vendor is, the proposed archetype + reference node(s), the **full
operation menu** — every operation by name, partitioned **proposed (2–5) / deferred / out of
scope**, each cut with a one-line reason — auth model, known risks/unknowns, and **what the node
will NOT be**. Tag any operation whose shape implies a different archetype (an on-demand
"extract fields against a schema" op is agent-tool-shaped even when parse is data-flow) — that's
the dual-classType signal (`archetype-map.md` in rocketride-building-nodes).

The menu MUST close with a count line: **"Menu complete: N operations, verified against
<the vendor's published operations list — name it or link it>."** Before writing that line,
re-check it: every operation you encountered anywhere in research appears in the menu. If you
cannot name the source you verified against, write "menu unverified" instead — never imply
completeness you didn't check. Researching an operation and then leaving it off the menu is the
exact failure this gate exists to prevent (the landing.ai run silently dropped 2 of 5 ops);
the cut happens at the gate, by the user, never silently in research.
Cite the original ask verbatim — if the issue says "DB node" and you're proposing a tool node,
that mismatch must be visible. If the ask names **no** archetype ("build a Supabase node") and
the vendor has multiple products (API + hosted DB + storage), present the options at Gate A and
ask — don't pick silently.
