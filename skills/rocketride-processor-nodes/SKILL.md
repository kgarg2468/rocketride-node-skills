---
name: rocketride-processor-nodes
description: Use when building a data-flow processor node for rocketride-server — text/NLP transforms, filters, enrichers, OCR, audio/video processing, or any node records flow through via lanes
---

# Data-Flow Processor Nodes

The broadest archetype (~20 nodes): data flows in on lanes, gets transformed/enriched/filtered,
flows out on lanes. Raw `IGlobalBase`/`IInstanceBase` (no specialized base).

## Reference nodes

- `nodes/src/nodes/anomaly_detector/` — PR #569; canonical: helper module (`detector.py`),
  one `preconfig` profile per detection method, pure stdlib
- `ner/`, `extract_data/`, `summarization/` — text/NLP; `question/` — minimal (text→questions)
- Audio: `audio_transcribe/` (audio→text), `audio_tts/` (text→audio)
- Video/image: `frame_grabber/` (video→image), `ocr/`, `thumbnail/`

## services.json distinctives

- `classType` is the **data category** (`["text"]`, `["audio"]`, `["image"]`; document parsers
  of the llamaparse/reducto class use `["data"]`), not "processor".
- The `lanes` block declares consumed/produced types, e.g.
  `{"text": ["text"], "documents": ["documents"]}`. Full ontology (10 lane types:
  questions/answers/documents/text/table/image/audio/video/tags/_source) with
  producer/consumer counts: `docs/README-nodes.md` — wire only types that neighbors actually
  produce/consume.
- Multi-mode processors: one `preconfig` profile per mode.

## The lane lifecycle (the contract)

IInstance implements: `open(obj)` → `write<Lane>(data)` per consumed lane (`writeText`,
`writeDocuments`, …) → `closing()` → `close()`.

- **Always forward downstream** via `self.instance.writeText(...)` /
  `self.instance.writeDocuments(...)` — including a **pass-through path when the node is
  unconfigured**. A processor that swallows records breaks every pipeline it sits in.
- **Never mutate inputs**: `doc.model_copy(deep=True)` before enriching metadata (#569).
- Accumulate-then-emit nodes do their work in `closing()`, not `close()`.

## Gotchas

- Real logic in a helper module; `IInstance` is a thin adapter — that's what makes the
  stub-test pattern work without the engine.
- `beginGlobal()` builds any engine/model once per pipeline run, shared across instances;
  skipped in `OPEN_MODE.CONFIG`; heavy imports lazy.
- LLM-backed processors (extract_data style) call the LLM through the pipeline's configured
  provider, not a hardcoded vendor.
- Media lanes carry payloads with size implications — stream/chunk, don't buffer unbounded.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
