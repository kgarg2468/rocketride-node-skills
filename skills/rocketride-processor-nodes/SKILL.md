---
name: rocketride-processor-nodes
description: Use when building a data-flow processor node for rocketride-server — text/NLP transforms, filters, enrichers, OCR, audio/video processing, or any node records flow through via lanes
---

# Data-Flow Processor Nodes

The broadest archetype: data flows in on lanes, gets transformed/enriched/filtered, flows out on
lanes. Raw `IGlobalBase`/`IInstanceBase` unless a current reference proves a narrower base.

## Reference nodes

- `nodes/src/nodes/anomaly_detector/` — PR #569; canonical: helper module (`detector.py`),
  one `preconfig` profile per detection method, pure stdlib
- `ner/`, `extract_data/`, `summarization/` — text/NLP; `question/` — minimal (text→questions)
- Audio: `audio_transcribe/` (audio→text), `audio_tts/` (text→audio)
- Image/CV: `detect_segment/`, `detect/`, `face_detection/`, `background_removal/`,
  `depth_estimate/`, `pose_estimation/` — image lanes, model loading, GPU/heavy-test patterns
- Video/image: `frame_grabber/` (video -> image), `ocr/`, `thumbnail/`

## services.json distinctives

- `classType` is the **data category** (`["text"]`, `["audio"]`, `["image"]`; document parsers
  of the llamaparse/reducto class use `["data"]`), not "processor".
- The `lanes` block declares consumed/produced types, e.g.
  `{"text": ["text"], "documents": ["documents"]}`. Full ontology (10 lane types:
  questions/answers/documents/text/table/image/audio/video/tags/_source) with
  producer/consumer counts: `docs/README-nodes.md` — wire only types that neighbors actually
  produce/consume.
- Multi-mode processors: one `preconfig` profile per mode.

## Image/CV processors

Use this section for object detection, segmentation, background removal, face detection, depth,
pose, OCR-like image transforms, and model-backed image enrichment.

- Route image segmentation to this archetype, usually anchored on `detect_segment` plus one of
  `detect`, `face_detection`, or `background_removal`; do not treat it as an LLM node unless the
  vendor is actually a chat/vision-LLM provider.
- `classType` is normally `["image"]`; add another class only when the node also exposes a
  genuine tool/database/source surface.
- Lanes should reflect payload reality: common patterns are image -> image, image -> text/tags,
  or image -> image+metadata. Do not invent a custom lane when the docs ontology already has one.
- Heavy model dependencies belong behind lazy imports in `beginGlobal()` and may require
  capabilities such as `"gpu"` or service-test flags such as `requiresLibs`/`fulltest`.
- Prefer shared model/pipeline helpers only when current code already has the pattern or the
  blast-radius gate approves a shared helper. Otherwise keep model wrappers node-local.
- Service tests should use small fixture images and `./builder nodes:test`; mark full-size/model
  cases with `fulltest` and run them with `./builder nodes:test-full` when feasible.

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
- Media lanes carry payloads with size implications — stream/chunk, cap dimensions where current
  references do, and don't buffer unbounded.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
