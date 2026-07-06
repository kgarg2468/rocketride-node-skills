# Node README docs page

`README.md` in the node directory is the canonical public node-docs source. The docs build scans
`nodes/src/nodes/**/README.md` and injects generated schema/dependency/source tables only inside
marker blocks.

Include this section in the Gate B mockup for a shipping node:

```markdown
<!-- ROCKETRIDE:GENERATED:PARAMS START -->
<!-- ROCKETRIDE:GENERATED:PARAMS END -->
```

The generator owns the content between those markers. Human-written usage notes, auth setup,
operation descriptions, limits, and examples live around the markers.

## Required sections

Use concise headings that match the public node docs style. `tool_deepl` is a good current
reference for a tool node; adapt the surface section for lane-based nodes.

- `# <node/provider name>`
- Opening one-liner: what the node exposes and which user problem it solves.
- `## What it does`: runtime behavior, whether data flows through lanes or agents invoke tools,
  and important defaults.
- Surface section:
  - `## Tools` for agent-invocable tool functions, with function names, key inputs, and returns.
  - `## Lanes` or `## Configuration` for lane-based nodes, with lane in/out and field behavior.
- `## Setup`: auth, environment variables, self-hosted base URL notes, and secret handling.
- `## Limits`: vendor limits, node-enforced caps, unsupported modes, payload size constraints,
  rate limits, and plan-tier caveats.
- `## Examples`: at least one minimal pipeline/use case or agent invocation shape when useful.
- `## Upstream docs`: official vendor/API docs links used for the operation inventory.
- `## Troubleshooting`: common config/auth/runtime failures and what the user should check.
- Generated marker block at the end, refreshed by `nodes:docs-generate`.

Rules:

- Do not require `doc.md` for new work. It is legacy/supplementary; the current docs migration
  moved node docs to co-located `README.md`.
- If a current reference still has `doc.md`, treat it as historical evidence, not a file to clone.
- Multi-service packages may have a root `README.md` plus service-specific nested READMEs when
  current precedent does that. Keep the root README as the catalog-facing page.
- When services.json fields change, rerun `./builder nodes:docs-generate` or explicitly note
  that generated marker contents were not refreshed.
- After merge, verify the public Markdown page appears through `https://docs.rocketride.org/llms.txt`
  and `https://docs.rocketride.org/nodes/<node>.md` once docs deploy.
