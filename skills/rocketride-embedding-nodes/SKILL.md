---
name: rocketride-embedding-nodes
description: Use when building an embedding node (embedding_*) for rocketride-server — turning text, images, or video into vectors for downstream stores
---

# Embedding Nodes

Named by **modality, not vendor**: `embedding_<modality>` (`embedding_openai` is the historical
exception; `embedding_transformer`, `embedding_image`, `embedding_video` are the pattern).

## Reference nodes

- `nodes/src/nodes/embedding_openai/` — profile-based model selection (hosted API)
- `nodes/src/nodes/embedding_video/` — PR #516; the 5-file local-model layout
- `embedding_transformer/` — local HuggingFace-style models

## Base class

`EmbeddingBase` (ABC) — `packages/ai/src/ai/common/embedding.py:9`. Implement:
`getVectorSize()`, `getMaximumTokens()`, `encodeQuestion(question)`, `encodeChunks(documents)`.
The factory `getEmbedding(provider, connConfig, bag)` (same file) routes provider names — a new
embedding driver may register there: **that's `packages/` = core = written suggestion for the
user**, unless your node is fully self-contained.

## services.json distinctives

- `classType: ["embedding"]`; lanes are **pass-through**: `documents/questions →
  documents/questions` (vectors attach to the records; the records flow on). Modality variants
  differ (`embedding_video`: video → documents).
- `preconfig.profiles` per model (small/large tiers); vector dimension + token limit tracked
  per profile.

## Gotchas

- **Pass-through means pass-through**: forward the same records (enriched), preserve order and
  metadata; never drop unvectorized records silently.
- Heavy model deps (torch, transformers) import lazily in `beginGlobal()`; build the model
  **once per pipeline run** in IGlobal and share across instances — not per-instance.
- Skip model loading in `OPEN_MODE.CONFIG`.
- Vector size must be queryable before first encode (stores create collections from it).
- Batch `encodeChunks` calls to the model/API; respect the per-model token limit by truncating
  with a `warning()`, not raising mid-pipeline.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
