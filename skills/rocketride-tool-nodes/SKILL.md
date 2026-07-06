---
name: rocketride-tool-nodes
description: Use when building an agent-invocable tool node (tool_*) for rocketride-server — wrapping a vendor HTTP API, SDK, or local capability as on-demand functions agents can call; no data lanes
---

# Tool Nodes

What agents call on demand. No data flows *through* them — `lanes: {}`.

## Reference nodes (clone from these)

- `nodes/src/nodes/tool_v0/` — newest conventions; its test file
  `nodes/test/test_tool_v0.py` (22 tests) is the canonical stub-test exemplar
- `nodes/src/nodes/tool_tavily/`, `tool_exa_search/` — thin REST + API-key wrappers.
  ⚠️ Clone tavily's IGlobal/services.json shape but **NOT its error handling** — tavily returns
  `{'success': False, ...}` dicts (grandfathered old style); use tool_v0's raise semantics.
- `nodes/src/nodes/tool_python/` — local/sandbox capability (no HTTP)
- Dual data+tool precedent: `tool_n8n` (PR #1231), `db_postgres` (`["database","tool"]`)

## services.json distinctives

`"classType": ["tool"]` · `"capabilities"` includes `"invoke"` (add `"experimental"` only when
approved by Gate B/current precedent) · `"lanes": {}` · `"register": "filter"` ·
`"node": "python"` · `"path": "nodes.<node_name>"`

## Contracts

- **IGlobal**: read config in `beginGlobal()` (skip when `openMode == OPEN_MODE.CONFIG`);
  validate the API key — config field with env-var fallback (e.g. `EXA_API_KEY`); raise on hard
  failure there, but `validateConfig()` only `warning()`s; `endGlobal()` clears secrets.
- **IInstance**: one method per tool, decorated
  `@tool_function(input_schema=..., output_schema=..., description=...)`
  (from `rocketlib`; defined in `packages/server/engine-lib/rocketlib-python/lib/rocketlib/filters.py`).
  Schemas are plain JSON Schema. **The description is what the agent's LLM sees — write it like
  a good tool prompt** (when to use, what it returns, constraints).
- **First line of every tool method:**
  `args = normalize_tool_input(args, tool_name='...')` (from `ai.common.utils`) — unwraps
  Pydantic/JSON-string/wrapper inputs.
- **HTTP:** use the shared `post_with_retry` from `ai.common.utils` (requests + tenacity) for
  POSTs; don't hand-roll POST retry loops. **There is no shared GET helper** — for GETs use
  plain `requests.get` with an explicit timeout (idempotent GET retries are acceptable to
  hand-roll if the vendor rate-limits; keep it simple otherwise). Don't bend `post_with_retry`
  into a GET.
- **Errors: raise, never return error dicts.** `ValueError` for bad input; `RuntimeError` for
  API errors (the tool_v0 convention — `tool_v0/IInstance.py`; tool_firecrawl instead re-raises
  vendor exceptions after retry — either way, **raise**). `{'success': False, ...}` dicts are
  the obsolete #509 style.

## Gotchas

- Expose the 2–5 operations users need, not the vendor's whole API — but the operation
  *inventory* shown at Gate A must be complete (the cut is the user's call, not research's; see
  rocketride-building-nodes Gate A).
- Defensive inputs: `isinstance(x, bool) or not isinstance(x, int)` (JSON `true` must not become
  `1`); clamp ranges `max(1, min(50, n))`.
- Never log the key; assert redaction in tests.
- If the agent passes a URL/path-shaped argument, sanitize it — the agent must never be able to
  redirect the node to a different host (SSRF containment; see tool_n8n's `_safe_path`).
- Self-hosted vendors: do NOT `validate_public_url` (it rejects localhost); default base URL to
  the vendor's standard local port.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
