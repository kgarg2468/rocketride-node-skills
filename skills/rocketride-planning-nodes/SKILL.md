---
name: rocketride-planning-nodes
description: Use when designing or mocking up a rocketride-server node before writing code — services.json shape, file layout, blast radius analysis, or breaking a node build into phases
---

# Planning RocketRide Nodes

Turn confirmed research + archetype into an approved design: mockup → blast radius → phased plan.
Anchor on real nodes — if a near-exact match exists, copy it wholesale as the template; otherwise
triangulate from two reference nodes. The point is getting shapes and contracts correct.

## Process

1. **Read the reference node(s)** named by the archetype skill — from `origin/develop`, every
   file. Read `node-anatomy.md` for the directory contract.
2. **Design `services.json` FIRST** — it forces every decision: config fields, profiles,
   lanes/tool surface, classType. See `services-json.md`; full schema is
   `docs/README-node-schema.md` in the checkout.
3. **Ground the vendor surface in the real API spec** (their OpenAPI/docs), not memory — #557
   verified every endpoint against Vercel's published `openapi.json`.
4. **Write the mockup artifact** using `mockup-template.md`: draft services.json, tool/lane
   surface, exact file list, blast radius, phase breakdown.
5. **Blast radius rule:** files outside `nodes/src/nodes/<name>/`, `nodes/test/`, `examples/`,
   `docs/` are flags. Anything in `packages/` (core/shared) becomes a written suggestion for the
   user with rationale — the build never edits core unilaterally. (Precedent: #524 put shared
   vector-store logic in `packages/ai/src/ai/common/store.py` — that was a deliberate,
   maintainer-reviewed choice, not a default.)
6. **Phase the build.** Size to complexity: provider clone 1–2 phases; multi-feature tool 2–4;
   agent node 5+. Each phase = a coherent feature slice with its tests, ending in the per-phase
   e2e audit (`rocketride-testing-nodes`). Phase 1 is always: scaffold + services.json +
   minimal happy path + contract tests passing.

## Output

The mockup artifact (step 4) is what the user approves at Gate B; the phase list is what they
approve at Gate C. Don't start coding before both.

## Supporting files

- `node-anatomy.md` — directory layout, naming, license headers, helper-module pattern
- `services-json.md` — condensed key reference + variant-file pattern
- `mockup-template.md` — the Gate B artifact format
