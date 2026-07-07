# rocketride-node-skills

Claude Code skills for authoring **RocketRide pipeline nodes** (rocketride-server), modeled on
[obra/superpowers](https://www.skills.sh/obra/superpowers). Point Claude at an integration name —
"build a DeepL node" — and the skill set drives the full lifecycle: research → archetype
confirmation → mockup → phased build with deep e2e testing → final massive e2e → ship.

## Install

One line — clone into the canonical location and link the skills:

```bash
git clone git@github.com:kgarg2468/rocketride-node-skills.git ~/rocketride-node-skills && bash ~/rocketride-node-skills/install.sh
```

Already cloned, or want the latest? This variant is safe to re-run:

```bash
git clone git@github.com:kgarg2468/rocketride-node-skills.git ~/rocketride-node-skills 2>/dev/null; git -C ~/rocketride-node-skills pull --ff-only; bash ~/rocketride-node-skills/install.sh
```

`install.sh` symlinks each skill into `~/.claude/skills/` (and `~/.agents/skills/` if present), so
updating later is just `git -C ~/rocketride-node-skills pull`. Requires SSH access to the repo (or
swap in `gh repo clone kgarg2468/rocketride-node-skills ~/rocketride-node-skills`).

> **After installing, start a fresh Claude Code session** — skills are read at session start, so a
> window you already had open won't see the new/updated skills until you reopen it.

## Quickstart

In any Claude Code session:

> build a tool_deepl node

The master skill (`rocketride-building-nodes`) picks it up, locates your rocketride-server
checkout, researches the integration, and **first checks the best integration pathway** (a fresh
node vs. an existing-engine variant, an MCP bridge, or a `tool_python` wrap) before **confirming the
archetype with you — no code until you approve the plan**. It then walks the build through per-phase
e2e audits and a ship-ready UX gate to a conventions-compliant PR, and at the end asks how far to
take it (full close-out with CI monitoring / PR only / draft / local branch).

## Skill map

| Skill | Role |
|---|---|
| `rocketride-building-nodes` | **Master dispatcher** — the whole lifecycle, 4 hard gates. The only skill you need to know. |
| `rocketride-researching-nodes` | Dual research: vendor API + internal precedent; light vs deep triage |
| `rocketride-planning-nodes` | Mockup, services.json design, blast radius, phased plan |
| `rocketride-testing-nodes` | Test ladder: stub pytest → contract suite → builder → live engine → manual UI |
| `rocketride-shipping-nodes` | Issue, branch ruleset, fork PR, CI, optional /loop monitoring |
| `rocketride-tool-nodes` | Archetype: agent-invocable tools (`tool_*`) |
| `rocketride-llm-nodes` | Archetype: LLM providers (`llm_*`, incl. vision) |
| `rocketride-vector-store-nodes` | Archetype: vector stores (pinecone/qdrant class) |
| `rocketride-database-nodes` | Archetype: relational DBs (`db_*`, incl. hosted flavors) |
| `rocketride-embedding-nodes` | Archetype: embeddings (`embedding_*`) |
| `rocketride-processor-nodes` | Archetype: data-flow processors (text/NLP/audio/video) |
| `rocketride-ingress-nodes` | Archetype: source/ingress nodes (webhook/telegram class) |
| `rocketride-agent-nodes` | Archetype: agent nodes (`agent_*`) |

## Requirements

- A rocketride-server checkout (the skills locate it via `$ROCKETRIDE_SERVER_DIR`, the cwd, a
  bounded search, or offer to clone it).
- `gh` authenticated for the shipping phase.

## Contributing

Lessons from real node builds go into `skills/rocketride-building-nodes/gotchas.md` (or the
matching archetype skill) via PR. Verify every claim against `origin/develop` before adding it —
the working doc this set was distilled from was written on a clone 18 commits stale.
