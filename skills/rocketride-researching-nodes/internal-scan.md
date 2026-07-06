# Internal precedent scan

How to census the existing catalog and find what to anchor on. `$REPO` = the rocketride-server
checkout; always read from `origin/develop`.

## Census commands

```bash
git -C "$REPO" ls-tree -d --name-only origin/develop:nodes/src/nodes        # all node dirs; count drifts
git -C "$REPO" show origin/develop:nodes/src/nodes/<name>/services.json     # any manifest
git -C "$REPO" grep -l '"classType"' origin/develop -- 'nodes/src/nodes/*/services*.json'
git -C "$REPO" show origin/develop:docs/README-nodes.md                     # catalog + lane ontology
git -C "$REPO" show origin/develop:docs/README-node-schema.md               # manifest schema
git -C "$REPO" show origin/develop:docs/README-node-testing.md              # service-test schema
```

Live docs cross-check:

```bash
curl -fsSL https://docs.rocketride.org/llms.txt
curl -fsSL https://docs.rocketride.org/nodes.md
curl -fsSL https://docs.rocketride.org/nodes/<reference>.md
```

Use the live docs to verify how the reference node is presented publicly; use `origin/develop`
to verify source truth. If they disagree, mention the drift at Gate A/B instead of silently
choosing one.

## What to extract per candidate reference node

- `classType`, `capabilities`, `lanes` (empty = tool; populated = data-flow)
- Which base class IGlobal/IInstance extend (raw IGlobalBase/IInstanceBase vs LLMBase /
  ToolsBase / DatabaseGlobalBase / DocumentStoreBase)
- Whether it has `IEndpoint.py` (source node) or variant `services.*.json` files
- Whether it has tests in `nodes/test/` (top-level or nested package layout; prefer references
  with tests)
- How recent it is (`git log -1 --format='%as %s' origin/develop -- nodes/src/nodes/<name>`)
  — newer nodes reflect the current conventions (e.g. raise-not-error-dicts arrived with
  tool_firecrawl/tool_v0)

## Best reference per archetype (verified on origin/develop)

| Archetype | Clone from | Why |
|---|---|---|
| Tool | `tool_v0` | newest conventions, 22-test exemplar (`nodes/test/test_tool_v0.py`) |
| Tool (search/API-key) | `tool_tavily`, `tool_exa_search` | thin REST wrappers |
| LLM | `llm_openai` | profiles per model, client helper module |
| Vision LLM | `llm_vision_openai` | image lanes on the LLM pattern |
| Vector store | `pinecone` | full three-interface node + record-update tests |
| SQL database | `db_postgres` | DatabaseGlobalBase pattern + `services.supabase.json` variant |
| Non-SQL database/tool | `db_arango` | custom database/tool node when no SQLAlchemy dialect/base fits |
| Embedding | `embedding_openai`, `embedding_video` | modality naming, profile selection |
| Processor | `anomaly_detector` | helper-module pattern, profiles per mode, pure stdlib |
| Audio processor | `audio_transcribe`, `audio_tts` | audio lane wiring |
| Image/CV processor | `detect_segment`, `detect`, `face_detection`, `background_removal` | image lanes, model loading, GPU/heavy-test patterns |
| Ingress | `webhook` | IEndpoint + multi-variant services files |
| Agent | `agent_rocketride` | native multi-module agent |
| Workflow platform | `tool_n8n` (PR #1231) | dual data+tool node, self-hosted vendor patterns |

## Also check

- Shared utils that already solve your problem: `packages/ai/src/ai/common/utils/`
  (`post_with_retry`, `normalize_tool_input`, `validate_public_url`, …) and
  `packages/ai/src/ai/common/store.py` (vector-store tool mixin).
- **Closed/withdrawn PRs for the same vendor** — learn why they died before re-deriving their
  mistakes (`gh pr list --repo rocketride-org/rocketride-server --search "<vendor>" --state all`).
- **Recent merged PR file layouts** — use them as current convention evidence, especially
  multi-service directories (`landing_ai`, `cloud_tts`) and non-SQL DBs (`db_arango`).
- Whether the node already exists under a different name (Kimi existed as `llm_kimi`;
  Tavily as `tool_tavily`).
