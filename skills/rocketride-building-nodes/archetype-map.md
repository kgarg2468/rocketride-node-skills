# Archetype dispatch table

Map the integration to an archetype, then load that archetype's skill BEFORE scaffolding.
Counts drift quickly as `origin/develop` moves. Census at research time and trust the rules here,
not any fixed count in this table.

| Archetype | Count | Skill | Primary reference node(s) | Tell-tale signals |
|---|---|---|---|---|
| Tool (agent-invocable) | 13 | `rocketride-tool-nodes` | `tool_v0`, `tool_tavily`, `tool_python` | "agent can call it"; vendor HTTP API wrapped as on-demand functions; no data flowing *through* it |
| LLM provider | 15 | `rocketride-llm-nodes` | `llm_openai` | vendor sells chat/completion models; questions→answers |
| Vision LLM | 4 | `rocketride-llm-nodes` (vision section) | `llm_vision_openai` | model consumes images |
| Vector store | 8 | `rocketride-vector-store-nodes` | `pinecone`, `qdrant` | vendor stores embeddings; semantic search; upsert+query |
| Database / DB tool | census | `rocketride-database-nodes` | `db_postgres`, `db_arango` | database access or query execution; SQL engines usually use the DB base; non-SQL engines may be custom `["database","tool"]` nodes |
| Embedding | census | `rocketride-embedding-nodes` | `embedding_openai`, `embedding_video` | turns content into vectors; named by modality (`embedding_<modality>`) |
| Data-flow processor | census | `rocketride-processor-nodes` | `anomaly_detector`, `ner`, `audio_transcribe`, `detect_segment` | data flows through and is transformed/enriched/filtered (text/NLP/audio/video/image) |
| Source / ingress | 2+ | `rocketride-ingress-nodes` | `webhook`, `telegram` | originates data from outside; needs an HTTP/external listener (IEndpoint) |
| Agent | 5 | `rocketride-agent-nodes` | `agent_rocketride` | orchestrates tools + multi-turn reasoning |

## Disambiguation rules

- **Data flows through it** → processor. **Agent calls it on demand** → tool. A node can be both
  (dual `classType`, e.g. `db_postgres` is `["database","tool"]`, `tool_n8n` is `["data","tool"]`)
  — say so explicitly at Gate A. Apply the test **per operation, not per vendor**: a multi-op
  vendor can be data-flow on one operation and tool-shaped on another (a parser's `parse` streams
  through lanes; its schema-driven `extract` is an on-demand call). Name the tool-shaped
  operations at Gate A even when the MVP is data-only — "if op X lands later, this likely becomes
  dual" beats rediscovering the archetype mid-build.
- A vendor with both an API *and* a hosted DB/storage product: ask what the user actually needs
  (the #1063 failure). Quote the issue text back at Gate A.
- The hosted-flavor rule is the **rule, not the example**: it applies to any vendor whose wire
  protocol is an engine we already speak (Neon/RDS/Supabase -> `db_postgres`; an
  OpenAI-compatible LLM API -> `llm_openai_api` profile), whether or not this table names them.
  A database with a different query model/protocol (for example ArangoDB) is not forced into the
  SQL base; classify it as a custom database/tool node and load the database skill.
- TTS/transcription → processor with audio lanes (model on `audio_transcribe` / `audio_tts`).
- A framework/library (LlamaIndex, LangChain) rather than a hosted API: scope question — raise it
  at Gate A; precedent is `agent_langchain` / `preprocessor_langchain`.
- Workflow platforms (n8n, Workato): tool + data dual node; precedent `tool_n8n` (PR #1231).
