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

Light depth trims the multi-agent fan-out, never the API surface census below: the census is
one docs-index read, and it is exactly what catches the feature you did not know to ask about.

## 2. External: what is this thing?

- **Census the full current API surface first.** Start from the vendor's docs index or
  API-reference nav (many vendors ship an `llms.txt` index), not from the one endpoint you came
  for. Enumerate every resource family, then shortlist adjacent high-value operations before
  choosing. The endpoint you came for is rarely the whole product: DeepL's nav lists translate,
  Write (rephrase + correct), document translation, glossaries, languages, and usage. A DeepL
  build researched from the translate page alone shipped without Write rephrase
  (`POST /v2/write/rephrase`), the vendor's second product line; the hand-researched PR #1245
  found it.
- **Check versioning and deprecation per chosen endpoint.** A working endpoint is not
  automatically the recommended one: DeepL marks `/v2/languages` deprecated, "migrate to
  v3/languages for new integrations." New nodes target the current version.
- The vendor's **published API spec** (OpenAPI if available) — endpoints, request/response
  shapes, error bodies. Ground in the spec, not memory.
- Auth model: API key? OAuth2 (token refresh = extra complexity)? Self-hosted base URL?
- Rate limits, pagination, payload size limits, sync vs async patterns.
- What users actually use it for (their docs/templates/community): this picks the 2–5
  operations from the census; it never replaces the census.
- Self-hostable vendors: assume users run it on localhost/Docker — don't reject private URLs;
  plan deploy-aware reachability hints (`host.docker.internal`).

## 3. Internal: what do we already have?

Follow `internal-scan.md`. Output: the closest existing node(s), the archetype, and prior art
worth copying. **Read reference material from `origin/develop`** (`git show`), not the working
tree.

## 4. Output (feeds Gate A)

A short brief: what the vendor is, the proposed archetype + reference node(s), the 2–5
operations/lanes proposed, auth model, known risks/unknowns, and **what the node will NOT be**.
Derive the NOT-list from the census: name each resource family you are cutting (one line each)
so the user can veto a cut at Gate A instead of discovering it after the build.
Cite the original ask verbatim — if the issue says "DB node" and you're proposing a tool node,
that mismatch must be visible. If the ask names **no** archetype ("build a Supabase node") and
the vendor has multiple products (API + hosted DB + storage), present the options at Gate A and
ask — don't pick silently.
