# Cross-cutting gotchas

Hard-won traps from merged node PRs (#509, #516, #524, #557, #569, #1231). Every claim verified
against `origin/develop`. Archetype-specific traps live in the archetype skills.

## Config & lifecycle

- **`validateConfig()` must `warning()`, never raise** — it runs during canvas editing.
  Helpers: `from rocketlib import debug, warning, error` (rocketlib/engine.py).
- **Skip real setup when `self.IEndpoint.endpoint.openMode == OPEN_MODE.CONFIG`** (canvas config
  mode) in `beginGlobal()` — don't build clients, bind ports, or hit networks.
- **`endGlobal()` clears secrets** (API keys, connection strings) from memory.
- Import heavy/vendor SDKs **lazily inside `beginGlobal()`**, not at module top.

## services.json

- **`prefix` must be unique** across the catalog — it's the URL↔path mapping. Grep before picking.
- **`enum` fields are `[[value, "Label"], ...]` pairs**, not flat lists (flat lists exist in older
  nodes; pairs render labels — use pairs).
- **Secrets:** `"secure": true` + `"ui": {"ui:widget": "ApiKeyWidget"}` + env-var fallback in
  `IGlobal` (e.g. `EXA_API_KEY`), and **never a real default value** (gitleaks has a custom rule
  for `services*.json`; `${VAR}` placeholders are allowlisted).
- Keep the explanatory JSONC comment blocks from the reference node's template.
- `description` is an array of strings joined together; `</br>` for line breaks.

## Files & layout

- **Per-node `requirements.txt` is not universal**. Add one when the node has node-local runtime
  dependencies or the reference node uses `depends(requirements.txt)`. Stdlib-only/shared-dep
  nodes can omit it; document the choice in the mockup.
- Every `.py` file starts with the **MIT license header** (Copyright Aparavi Software AG) — copy
  it verbatim from any existing node.
- **SVG icon:** co-located in the node dir, referenced by filename. The renderer **rejects SVGs
  missing explicit `width`/`height` on the root element** and silently falls back to a generic
  chain-link icon. Complete valid scaffold:

  ```xml
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"
       fill="currentColor">
    <path d="..."/>
  </svg>
  ```

  Use `fill="currentColor"`, **never `fill="#000"`** — SVGO's preset-default strips
  default-black before the auto-currentcolor pass, breaking dark mode. **Sourcing:** for a
  vendor node, users expect the vendor's official brand mark — prefer their brand SVG
  (normalized to `currentColor` where the mark allows). If you draw an original glyph instead,
  say so at Gate B and offer to swap in the brand SVG.
- Real logic goes in a **helper module** (e.g. `detector.py`, `n8n_client.py`) so
  `IInstance` stays a thin adapter that's unit-testable without the engine.

## Data handling

- **Never mutate inputs** — `doc.model_copy(deep=True)` before enriching (the #569 pattern).
- **Always forward downstream** (`self.instance.writeText(...)` etc.), including a pass-through
  path when the node is unconfigured.
- Tool methods **raise** (`ValueError` for bad input, `RuntimeError` for API errors) — never
  return `{'success': False, ...}` error dicts (the tool_firecrawl convention; #509's dicts are
  the old style).
- Defensive input guards: `isinstance(x, bool) or not isinstance(x, int)` so `true` doesn't
  silently become `1`; clamp numeric ranges (`max(1, min(50, n))`).
- Gate **protected outcomes**, not operation names. Inventory every equivalent mutation route
  (including aliases, bulk paths, retries, and indirect helpers); when denied, make no vendor
  call and persist no mutation.
- For persisted state, name the refresh source and single commit boundary so partial responses,
  reads, previews, and retries cannot silently commit stale or incomplete state.

## Process

- **Trust `origin/develop`**, not the local tree (clones go stale fast) and not PR descriptions
  (merged code differs from PR prose — #509).
- Before adding a private validator or helper, search `origin/develop`, shared utilities, and
  sibling nodes for the established contract. Audit copied code and any claimed-shared helper for
  lineage and relevant dependency version floors. Choose in-scope parity, an approved shared
  helper, or an explicit follow-up; do not widen scope to repair unrelated lineage.
- Shared HTTP: `from ai.common.utils import post_with_retry`; tool input normalization:
  `normalize_tool_input` (both in `packages/ai/src/ai/common/utils/`).
- Naming: `tool_<vendor>`, `llm_<vendor>`, `embedding_<modality>`, `db_<engine>`, otherwise
  descriptive snake_case.
- The engine discovers nodes by scanning `services*.json` — **there is no central registry to
  edit**. A new-node PR should default to the node dir, `nodes/test/`, and `examples/`.
  Shared-code edits are an explicit blast-radius decision: list them, justify with current
  merged precedent, test the shared behavior, and phase them separately.
