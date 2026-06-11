# Anatomy of a node

Every node is a self-contained directory under `nodes/src/nodes/<node_name>/`. The engine
discovers nodes by scanning for `services*.json` — **there is no central registry to edit**.

```
nodes/src/nodes/<node_name>/
├── __init__.py        # license header + `from .IGlobal import IGlobal` /
│                      #   `from .IInstance import IInstance` + __all__; a depends(requirements.txt)
│                      #   bootstrap ONLY if the node has runtime deps to auto-install (~10 of 90
│                      #   nodes do — db_*, tool_firecrawl; tool_v0/tool_tavily don't). Match your
│                      #   reference node.
├── IGlobal.py         # per-pipeline-run state: config read, validation, client/driver setup
├── IInstance.py       # per-instance logic: @tool_function methods OR lane write handlers
├── IEndpoint.py       # SOURCE NODES ONLY: the external listener (webhook/chat class)
├── services.json      # node manifest: metadata, config schema, UI shape, test block
├── requirements.txt   # per-node deps; ship one even if stdlib-only (with a comment)
├── <name>.svg         # co-located icon, referenced by filename in services.json
├── <helper>.py        # real logic module (detector.py, n8n_client.py) — keep IInstance thin
└── README.md          # optional but expected for nonobvious auth/transport decisions

nodes/test/test_<node_name>.py      # network-free pytest (see rocketride-testing-nodes)
examples/<name>.pipe                # optional example pipeline
```

## Rules

- Every `.py` file starts with the **MIT license header** (Copyright Aparavi Software AG) —
  copy verbatim from any existing node.
- **Naming:** `tool_<vendor>`, `llm_<vendor>`, `embedding_<modality>`, `db_<engine>`; everything
  else descriptive snake_case. Config field keys are `"<node_name>.<fieldName>"` (camelCase
  field names).
- **Helper-module pattern:** put real logic (HTTP clients, algorithms) in a sibling module so
  `IInstance` is a thin adapter, unit-testable without the engine.
- **Write order:** services.json → IGlobal → IInstance → helpers → tests. The manifest forces
  the design decisions; code follows it.
- A hosted *flavor* of an existing engine (e.g. Supabase over Postgres) is a
  `services.<flavor>.json` + `<flavor>.svg` **in the existing node's directory** — see
  `db_postgres/services.supabase.json` on origin/develop. Multi-variant sources do the same
  (`webhook/services.{webhook,chat,dropper}.json`).
