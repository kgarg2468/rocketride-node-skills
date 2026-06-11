# Internal precedent scan

How to census the existing catalog and find what to anchor on. `$REPO` = the rocketride-server
checkout; always read from `origin/develop`.

## Census commands

```bash
git -C "$REPO" ls-tree -d --name-only origin/develop:nodes/src/nodes        # all node dirs (~88)
git -C "$REPO" show origin/develop:nodes/src/nodes/<name>/services.json     # any manifest
git -C "$REPO" grep -l '"classType"' origin/develop -- 'nodes/src/nodes/*/services*.json'
git -C "$REPO" show origin/develop:docs/README-nodes.md                     # catalog + lane ontology
```

## What to extract per candidate reference node

- `classType`, `capabilities`, `lanes` (empty = tool; populated = data-flow)
- Which base class IGlobal/IInstance extend (raw IGlobalBase/IInstanceBase vs LLMBase /
  ToolsBase / DatabaseGlobalBase / DocumentStoreBase)
- Whether it has `IEndpoint.py` (source node) or variant `services.*.json` files
- Whether it has a test file in `nodes/test/` (prefer references with tests)
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
| Relational DB | `db_postgres` | DatabaseGlobalBase pattern + `services.supabase.json` variant |
| Embedding | `embedding_openai`, `embedding_video` | modality naming, profile selection |
| Processor | `anomaly_detector` | helper-module pattern, profiles per mode, pure stdlib |
| Audio processor | `audio_transcribe`, `audio_tts` | audio lane wiring |
| Ingress | `webhook` | IEndpoint + multi-variant services files |
| Agent | `agent_rocketride` | native multi-module agent |
| Workflow platform | `tool_n8n` (PR #1231) | dual data+tool node, self-hosted vendor patterns |

## Also check

- Shared utils that already solve your problem: `packages/ai/src/ai/common/utils/`
  (`post_with_retry`, `normalize_tool_input`, `validate_public_url`, …) and
  `packages/ai/src/ai/common/store.py` (vector-store tool mixin).
- **Closed/withdrawn PRs for the same vendor** — learn why they died before re-deriving their
  mistakes (`gh pr list --repo rocketride-org/rocketride-server --search "<vendor>" --state all`).
- Whether the node already exists under a different name (Kimi existed as `llm_kimi`;
  Tavily as `tool_tavily`).
