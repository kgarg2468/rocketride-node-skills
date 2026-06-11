---
name: rocketride-vector-store-nodes
description: Use when building a vector store / vector DB node for rocketride-server (pinecone, qdrant, chroma, weaviate class) — embedding storage, semantic search, upsert + query
---

# Vector Store Nodes

The heaviest archetype: a **three-interface node** (IGlobal + IInstance + IEndpoint) that is
simultaneously a data-flow store (documents in/out) and an agent-searchable tool.

## Reference nodes

- `nodes/src/nodes/pinecone/` — most complete (helper module, record-update tests)
- `nodes/src/nodes/qdrant/`, `chroma/` — second references for triangulation
- Mixin test: `nodes/test/test_vectordb_tool_mixin.py`

## Base classes

- `DocumentStoreBase` (ABC) — `packages/ai/src/ai/common/store.py:10`. Implement the abstract
  surface: `searchSemantic()`, `searchKeyword()`, `addChunks()`, `remove()`, `markDeleted()`,
  `markActive()`, collection existence/creation. The base provides collection lifecycle (with
  locking), search-result processing, table reassembly.
- `VectorStoreToolMixin` — `store.py:643` — gives the agent-tool face (search as a callable
  tool). IInstance pattern (from pinecone):
  `class IInstance(VectorStoreToolMixin, IInstanceTransform)`.
- IGlobal extends `IGlobalTransform` (`packages/ai/src/ai/common/transform.py`).

## services.json distinctives

- `classType: ["store", "tool"]` — the tool face is declared explicitly in the manifest
  (pinecone/services.json), the mixin implements it. These nodes have `IEndpoint.py`.
- Lanes (pinecone): `"documents": []` (upsert sink — produces nothing) and
  `"questions": ["documents", "answers", "questions"]` (query lane — all outputs hang off it).
  Upsert and query run concurrently.

## Gotchas

- **Shared logic lives in `store.py`, not your node dir** (PR #524 retrofit). If your vendor
  needs a base-class change, that's `packages/` = core = a written suggestion for the user, not
  an edit.
- Thread safety: upsert + query run concurrently; use the base's collection locking, don't
  invent your own.
- Connection checks in `validateConfig()` warn, never raise; real connection in `beginGlobal()`
  (skipped in `OPEN_MODE.CONFIG`).
- Vector dimensions come from the upstream embedding node — don't hardcode.
- Test the record-update path (pinecone's tests are the model), not just insert+search.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
