---
name: rocketride-llm-nodes
description: Use when building an LLM provider node (llm_*) or vision LLM node (llm_vision_*) for rocketride-server — chat/completion model integrations, questions→answers
---

# LLM Provider Nodes

The most clone-able archetype: 16 `llm_*` nodes (15 providers + the `llm_openai_api` adapter),
all the same shape. **Copy `llm_openai` wholesale and diff** — a new provider is usually a thin
pass (client module + profiles + key field).

## Reference nodes

- `nodes/src/nodes/llm_openai/` — canonical; note the sibling client helper module pattern
- `nodes/src/nodes/llm_openai_api/` — OpenAI-compatible third-party endpoints (base-URL
  override) — start HERE if the vendor exposes an OpenAI-compatible API
- Vision: `nodes/src/nodes/llm_vision_openai/`

## Base class

`LLMBase` — `packages/ai/src/ai/common/llm_base.py`. Extend it in IInstance; implement
`_question(question) → answer` (it wires `writeQuestions`, streaming/reasoning chunks, and the
invoke surface: `getContextLength`, `getOutputLength`, `getTokenCounter`, `ask`).

## services.json distinctives

- `classType: ["llm"]`; lanes `questions → answers` (uniform across all providers).
- **`preconfig.profiles` one per model/tier** (llm_openai ships one per GPT model);
  `preconfig.default` = the sensible default model.
- Fields: model `enum` as `[[value, "Label"]]` pairs, api key (`secure: true` + ApiKeyWidget +
  env fallback), max tokens/temperature with `minimum`/`maximum`, optional base-URL override.

## Vision variant

Same provider plumbing; what changes is the lanes (`image`/`documents` in → `text`/`documents`
out) and the message-building (image payloads attached to the prompt). Clone
`llm_vision_openai` and keep the provider client shared with the text node if both exist.

## Gotchas

- Lazy-import the vendor SDK inside `beginGlobal()`; never at module top.
- Token counting matters — implement the counter methods honestly per the vendor's tokenizer
  (or its documented approximation).
- Map provider errors to clear messages in `validateConfig()` warnings (bad key, missing model,
  quota) — it must not raise.
- Check the vendor isn't already covered: 16 `llm_*` nodes exist (`llm_kimi`, `llm_qwen`,
  `llm_baidu_qianfan`…), and OpenAI-compatible vendors may only need a profile on
  `llm_openai_api`, not a new node — raise that at Gate A.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
