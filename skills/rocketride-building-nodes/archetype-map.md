# Archetype dispatch table

Map the integration to an archetype, then load that archetype's skill BEFORE scaffolding.
Counts verified against `origin/develop` in June 2026 (~90 node dirs) — counts drift as develop
moves; census at research time, trust the rules here, not the numbers.

| Archetype | Count | Skill | Primary reference node(s) | Tell-tale signals |
|---|---|---|---|---|
| Tool (agent-invocable) | 13 | `rocketride-tool-nodes` | `tool_v0`, `tool_tavily`, `tool_python` | "agent can call it"; vendor HTTP API wrapped as on-demand functions; no data flowing *through* it |
| LLM provider | 15 | `rocketride-llm-nodes` | `llm_openai` | vendor sells chat/completion models; questions→answers |
| Vision LLM | 4 | `rocketride-llm-nodes` (vision section) | `llm_vision_openai` | model consumes images |
| Vector store | 8 | `rocketride-vector-store-nodes` | `pinecone`, `qdrant` | vendor stores embeddings; semantic search; upsert+query |
| Relational DB | 5 | `rocketride-database-nodes` | `db_postgres` | SQL database — **hosted Postgres flavors (Supabase, Neon, RDS) are a `services.<flavor>.json` variant of `db_postgres`, NOT a new node** |
| Embedding | 4 | `rocketride-embedding-nodes` | `embedding_openai`, `embedding_video` | turns content into vectors; named by modality (`embedding_<modality>`) |
| Data-flow processor | ~20 | `rocketride-processor-nodes` | `anomaly_detector`, `ner`, `audio_transcribe` | data flows through and is transformed/enriched/filtered (text/NLP/audio/video/image) |
| Source / ingress | 2+ | `rocketride-ingress-nodes` | `webhook`, `telegram` | originates data from outside; needs an HTTP/external listener (IEndpoint) |
| Agent | 5 | `rocketride-agent-nodes` | `agent_rocketride` | orchestrates tools + multi-turn reasoning |

## Disambiguation rules

- **Data flows through it** → processor. **Agent calls it on demand** → tool. A node can be both
  (dual `classType`, e.g. `db_postgres` is `["database","tool"]`, `tool_n8n` is `["data","tool"]`)
  — say so explicitly at Gate A.
- A vendor with both an API *and* a hosted DB/storage product: ask what the user actually needs
  (the #1063 failure). Quote the issue text back at Gate A.
- The hosted-flavor rule is the **rule, not the example**: it applies to any vendor whose wire
  protocol is an engine we already speak (Neon/PlanetScale/RDS → `db_postgres`/`db_mysql`
  variants; an OpenAI-compatible LLM API → `llm_openai_api` profile), whether or not this table
  names them.
- TTS/transcription → processor with audio lanes (model on `audio_transcribe` / `audio_tts`).
- A framework/library (LlamaIndex, LangChain) rather than a hosted API: scope question — raise it
  at Gate A; precedent is `agent_langchain` / `preprocessor_langchain`.
- Workflow platforms (n8n, Workato): tool + data dual node; precedent `tool_n8n` (PR #1231).
