# Mockup artifact — the Gate B deliverable

Present this to the user before any code exists. Keep it short enough to read in two minutes.

```markdown
# Node mockup: <node_name>

## What it is
<1-3 sentences: archetype, what it does in a pipeline, which users/use-cases>

## Surface
<For tool nodes: the tool functions — name, one-line description, key inputs/outputs.
 For data-flow nodes: lanes consumed → produced, what the transform does.
 Dual nodes: both.>

## Draft services.json (decisions only)
- classType: [...]            lanes: {...}
- prefix: <unique?  grepped: yes/no>
- profiles: <list, and which is default>
- fields: <table: key | type | default | secure? | enum values>

## Reference node(s) anchored on
<node + what is copied vs diverges>

## Files
| File | New/Modified | Purpose |
|---|---|---|
| nodes/src/nodes/<name>/... | new | ... |
| nodes/test/test_<name>.py | new | ... |
| examples/<name>.pipe | new (optional) | ... |

## Blast radius
<"Self-contained: nothing outside the node dir + tests + examples" — the goal.
 Any file outside that set: list it and why.
 Any packages/ (core) need: DO NOT plan to edit it — write the suggestion below.>

## Core-change suggestions (user decides; not part of this build)
<e.g. "shared retry helper would benefit from X — suggest pitching to eng">

## Phases
| Phase | Scope | Ends with |
|---|---|---|
| 1 | scaffold + services.json + happy path | per-phase e2e audit |
| 2 | ... | per-phase e2e audit |
| final | — | massive e2e + self code review |

## Open questions for you
<anything ambiguous — auth model, scope cuts, naming>
```
