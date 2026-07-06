# Design questions — decide the node's shape with the user

Before drawing the mockup, walk the user through the node's **material design decisions** as
multiple-choice questions with a **recommended default**. This is the RocketRide-node version of the
Superpowers brainstorming pattern.

## How to ask

- Use the `AskUserQuestion` tool (or equivalent multiple-choice). **One decision per question.**
- 2–4 **mutually-exclusive** options. Mark the **recommended** one and give a one-line **tradeoff**
  for each — the recommendation must come from the reference node/precedent or the vendor's shape,
  **not** preference.
- Ask **only** decisions that (a) materially change the build and (b) the reference clone doesn't
  already settle. If the clone dictates the answer, **state it, don't ask** — over-asking is friction
  (Anthropic guidance: clarify only where guessing creates rework).
- If there is no real recommendation, it isn't a design question — pick the precedent and move on.
- **Record every answer** in the mockup's "Design decisions (chosen + why)" section; they feed Gate B.

## Common questions (most archetypes)

- **Operations to expose** — from the Gate A menu, which 2–5 ship in the MVP? *Recommended:* the
  vendor's most-used operations (per research); defer the rest. *Tradeoff:* more ops = more surface,
  tests, review.
- **Auth model** — API key (secure field) / OAuth2 (token refresh) / self-hosted base URL.
  *Recommended:* the vendor's primary; prefer API-key if offered. *Tradeoff:* OAuth2 adds refresh
  and storage complexity.
- **Sync vs streaming** (only if the vendor and the archetype base both support both) — *Recommended:*
  match the reference node's default. *Tradeoff:* streaming is more code and more test surface.

## Per-archetype questions

Each archetype skill holds the authoritative options; these are the decisions worth surfacing.

- **Tool** (`rocketride-tool-nodes`): one `@tool_function` per operation vs a single multiplexed
  function (*rec:* one per operation, matches `tool_v0`); strict input schema vs pass-through
  (*rec:* normalized schema via `normalize_tool_input`).
- **LLM** (`rocketride-llm-nodes`): streaming on/off (*rec:* on if the provider supports it, matches
  `llm_openai`); expose reasoning/thinking surface (*rec:* only if the provider has one); separate
  `llm_vision_*` node (*rec:* only if the model consumes images).
- **Embedding** (`rocketride-embedding-nodes`): node modality → `embedding_<modality>` (*rec:* the
  vendor's primary modality); chunk/batch strategy (*rec:* inherit `EmbeddingBase` defaults).
- **Processor** (`rocketride-processor-nodes`): stream-per-record vs accumulate-then-emit (*rec:*
  stream per record unless the transform needs the whole set; *tradeoff:* accumulate buffers memory);
  hosted API vs local model (*rec:* hosted unless offline is required; local = heavier deps + blast
  radius).
- **Database** (`rocketride-database-nodes`): SQL base (`DatabaseGlobalBase`) vs custom
  database/tool node (*rec:* SQL base if it speaks SQL, custom like `db_arango` if a different query
  model); expose inherited NL-to-query (*rec:* yes if the base provides it).
- **Vector store** (`rocketride-vector-store-nodes`): which interfaces (IGlobal / IInstance /
  IEndpoint) the store needs (*rec:* match `pinecone` for a full store); namespace/collection handling
  (*rec:* per the vendor).
- **Ingress** (`rocketride-ingress-nodes`): transport — webhook HTTP vs poll/socket (*rec:* match the
  vendor's push model, `webhook` precedent); verify inbound signatures (*rec:* yes if the vendor signs).
- **Agent** (`rocketride-agent-nodes`): framework-native (`agent_langchain`/`llamaindex`/`crewai`)
  vs native multi-module (`agent_rocketride`) (*rec:* native unless the user names a framework);
  iteration limit + token budget (*rec:* hard caps, match `agent_rocketride`); tool-discovery scope —
  all tools vs a whitelist (*rec:* per use-case).
