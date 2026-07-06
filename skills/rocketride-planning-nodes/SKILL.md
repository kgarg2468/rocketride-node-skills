---
name: rocketride-planning-nodes
description: Use when designing or mocking up a rocketride-server node before writing code — services.json shape, file layout, blast radius analysis, or breaking a node build into phases
---

# Planning RocketRide Nodes

Turn confirmed research + archetype into an approved design: mockup → blast radius → phased plan.
Anchor on real nodes — if a near-exact match exists, copy it wholesale as the template; otherwise
triangulate from two reference nodes. The point is getting shapes and contracts correct.

## Precondition

Planning starts only after a Gate A research brief exists. If the user jumps straight to
"plan/build a node" and there is no confirmed Gate A brief, switch to
`rocketride-researching-nodes`, run the exists check + live-docs/repo-docs pass, present Gate A,
and stop. Do not produce a Gate B mockup just because the user used the word "plan".

## Process

1. **Read the reference node(s)** named by the archetype skill — from `origin/develop`, every
   file. Read `node-anatomy.md` for the directory contract and `docs-page.md` for co-located
   README requirements. If the Gate A brief lacks docs evidence, run the live-docs mini-pass
   now before drafting anything:
   `https://docs.rocketride.org/llms.txt`, `/nodes.md`, `/concepts/nodes.md`,
   `/pipeline-reference.md`, and the closest public node page.
2. **Design `services.json` FIRST** — it forces every decision: config fields, profiles,
   lanes/tool surface, classType. See `services-json.md`; full schema is
   `docs/README-node-schema.md` in the checkout.
3. **Ground the vendor surface in the real API spec** (their OpenAPI/docs), not memory — #557
   verified every endpoint against Vercel's published `openapi.json`.
4. **Write the mockup artifact** using `mockup-template.md`: draft services.json, required
   README plan with generated marker blocks, tool/lane surface, exact file list, blast radius,
   phase breakdown. The README is a Gate B deliverable because it renders into the public docs
   and LLM docs surface.
5. **Blast radius rule:** files outside `nodes/src/nodes/<name>/`, `nodes/test/`, and
   `examples/` are flags. Anything in `packages/` or other shared code needs a written Gate B/C
   section with rationale, current PR precedent, extra tests, and a separate phase. (Precedent:
   some merged nodes deliberately added shared helpers; that was maintainer-reviewed, not a
   default.)
6. **Phase the build.** Size to complexity: provider clone 1–2 phases; multi-feature tool 2–4;
   agent node 5+. Each phase = a coherent feature slice with its tests, ending in the per-phase
   e2e audit (`rocketride-testing-nodes`). Phase 1 is always: scaffold + services.json +
   minimal happy path + contract tests passing.

## Output

The mockup artifact (step 4) is what the user approves at Gate B; the phase list is what they
approve at Gate C. The Gate B artifact must include a docs-evidence line with the exact public
docs URLs read, or say `public docs unverified`. Don't start coding before both.

## Supporting files

- `node-anatomy.md` — directory layout, naming, license headers, helper-module pattern
- `docs-page.md` — node README generated markers, docs migration notes, `doc.md` legacy status
- `services-json.md` — condensed key reference + variant-file pattern
- `mockup-template.md` — the Gate B artifact format
