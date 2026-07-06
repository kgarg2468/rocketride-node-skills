# Anatomy of a node

Every node is a self-contained directory under `nodes/src/nodes/<node_name>/`. The engine
discovers nodes by scanning for `services*.json` — **there is no central registry to edit**.

```
nodes/src/nodes/<node_name>/
├── __init__.py        # license header + `from .IGlobal import IGlobal` /
│                      #   `from .IInstance import IInstance` + __all__; a depends(requirements.txt)
│                      #   bootstrap ONLY if the node has runtime deps to auto-install. Match your
│                      #   reference node.
├── IGlobal.py         # per-pipeline-run state: config read, validation, client/driver setup
├── IInstance.py       # per-instance logic: @tool_function methods OR lane write handlers
├── IEndpoint.py       # SOURCE NODES ONLY: the external listener (webhook/chat class)
├── services.json      # node manifest: metadata, config schema, UI shape, test block
├── requirements.txt   # only when the node has node-local deps / depends() bootstrap
├── <name>.svg         # co-located icon, referenced by filename in services.json
├── <helper>.py        # real logic module (detector.py, n8n_client.py) — keep IInstance thin
└── README.md          # canonical node docs page; include generated marker blocks

nodes/test/test_<node>.py           # simple network-free pytest
nodes/test/<node_name>/...          # nested layout for multi-service packages
examples/<name>.pipe                # optional example pipeline
```

Multi-service packages can keep shared code at the node root with one manifest per catalog
entry, e.g. `services.extract.json`, `services.parse.json`, nested helper/readme folders, and
nested tests under `nodes/test/<node_name>/<service>/`. Copy the shape from the closest current
reference instead of forcing everything into one flat file.

## Rules

- Every `.py` file starts with the **MIT license header** (Copyright Aparavi Software AG) —
  copy verbatim from any existing node.
- **Naming:** `tool_<vendor>`, `llm_<vendor>`, `embedding_<modality>`, `db_<engine>`; everything
  else descriptive snake_case. Config field keys are `"<node_name>.<fieldName>"` (camelCase
  field names).
- **Helper-module pattern:** put real logic (HTTP clients, algorithms) in a sibling module so
  `IInstance` is a thin adapter, unit-testable without the engine.
- **Write order:** services.json -> README markers -> IGlobal -> IInstance -> helpers -> tests.
  The manifest and docs force the design decisions; code follows them.
- A hosted *flavor* of an existing engine (e.g. Supabase over Postgres) is a
  `services.<flavor>.json` + `<flavor>.svg` **in the existing node's directory** — see
  `db_postgres/services.supabase.json` on origin/develop. Multi-variant sources do the same
  (`webhook/services.{webhook,chat,dropper}.json`).
