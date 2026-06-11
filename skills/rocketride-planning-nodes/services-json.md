# services.json — condensed reference

Full schema: `docs/README-node-schema.md` in the checkout (read it; this is the working summary).
The file is JSONC — keep the explanatory comment blocks from the reference node's template.

## Top-level keys

| Key | Notes |
|---|---|
| `title` | Display name in the catalog |
| `protocol` | `<node_name>://` |
| `classType` | What it is: `["tool"]`, `["llm"]`, `["database","tool"]` (dual nodes list both) |
| `capabilities` | Tool nodes: `["invoke", "experimental"]` — always mark new nodes `experimental` |
| `register` | `"filter"` for nearly all nodes; `"endpoint"` for sources |
| `node` | `"python"` |
| `path` | `"nodes.<node_name>"` |
| `prefix` | URL↔path mapping — **must be unique across the catalog; grep before picking** |
| `icon` | Co-located SVG filename |
| `description` | Array of strings, joined; `</br>` for breaks |
| `tile` | Usually `[]` |
| `lanes` | Data-flow ports; `{}` for pure tool nodes |
| `preconfig` | Preset profiles; `preconfig.default` names the profile applied on canvas drop |
| `fields` | Config schema (RJSF) |
| `shape` | Side-panel layout: list `"type"` + your field keys under a `"Pipe"` section |
| `test` | Test-framework block (see `rocketride-testing-nodes`) |

## fields

Keyed `"<node_name>.<fieldName>"`. Each: `type`, `title`, `description`, `default`, plus:

- numbers: `minimum` / `maximum`
- enums: `"enum": [["value", "Label"], ...]` — **pairs, not flat lists**
- secrets: `"secure": true` + `"ui": {"ui:widget": "ApiKeyWidget"}`, env-var fallback handled in
  IGlobal, **never a real default** (gitleaks scans `services*.json`; `${VAR}` is allowlisted)

## preconfig.profiles

Preset configs are great UX — one per mode/model tier (anomaly_detector ships one per detection
method; llm_openai one per model). `preconfig.default` picks the drop-time profile.

## Variant files

`services.<flavor>.json` beside `services.json` registers a second catalog entry from the same
code — hosted flavors (`db_postgres/services.supabase.json`) and multi-face sources
(`webhook/services.{webhook,chat,dropper}.json`). Prefer a variant over a new node whenever the
underlying protocol is identical.
