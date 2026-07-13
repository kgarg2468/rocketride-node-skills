# Mockup artifact — the Gate B deliverable

Present this to the user before any code exists. Keep it short enough to read in two minutes.

```markdown
# Node mockup: <node_name>

## What it is
<1-3 sentences: archetype, what it does in a pipeline, which users/use-cases>

## Design decisions (chosen + why)
<the answers to the design questions (design-questions.md), each: decision -> chosen option + a
one-line why. Note the recommended default you offered and what the user picked if different.>

## Surface
<For tool nodes: the tool functions — name, one-line description, key inputs/outputs.
 For data-flow nodes: lanes consumed → produced, what the transform does.
 Dual nodes: both.>

## Draft services.json (decisions only)
- classType: [...]            lanes: {...}
- capabilities: <list + why these match current precedent>
- prefix: <unique?  grepped: yes/no>
- profiles: <list, and which is default>
- fields: <table: key | type | default | secure? | enum values>
- test block: <builder nodes:test coverage, fulltest/requiresLibs/avoidMocks decisions, or why omitted>

## README.md
- canonical node docs page: yes/no
- generated markers included: yes/no
- required sections covered: what it does, surface, setup, config/lanes/tools, limits, examples,
  upstream docs, troubleshooting
- live docs references read: `llms.txt`, `/nodes.md`, `/concepts/nodes.md`, `/pipeline-reference.md`,
  closest node page
- `doc.md` needed only as legacy/supplementary material: yes/no

## Reference node(s) anchored on
<node + what is copied vs diverges>

## Risk/effect map
<Complete every row, or mark it N/A with a concrete reason.>

| Risk/effect | Decision or N/A + concrete reason | Control | Verification |
|---|---|---|---|
| Protected outcomes and every equivalent route | ... | ... | ... |
| Persisted state, refresh source, and commit boundary | ... | ... | ... |
| Exact user content vs identifiers; missing/empty semantics | ... | ... | ... |
| Continuation/cursor scope | ... | ... | ... |
| Copied code and claimed shared-helper lineage | ... | ... | ... |
| Reversibility, recovery, idempotency, and destruction claims | ... | ... | ... |

## Files
| File | New/Modified | Purpose |
|---|---|---|
| nodes/src/nodes/<name>/... | new | ... |
| nodes/test/... | new | top-level or nested test layout, matching the package shape |
| examples/<name>.pipe | new (optional) | ... |

## Blast radius
<"Self-contained: nothing outside the node dir + tests + examples" — the default.
 Any file outside that set: list it and why.
 Any packages/ or shared-code need: list the PR precedent, tests, and separate phase.>

## Shared-code gate (only if needed)
<files, rationale, why node-local code is insufficient, PR precedent, extra tests, rollback risk>

## Phases
| Phase | Scope | Ends with |
|---|---|---|
| 1 | scaffold + services.json + happy path | per-phase e2e audit |
| 2 | ... | per-phase e2e audit |
| final | — | massive e2e + self code review |

## Open questions for you
<anything ambiguous — auth model, scope cuts, naming>
```
