---
name: rocketride-agent-nodes
description: Use when building or modifying an agent node (agent_*) for rocketride-server — multi-turn reasoning nodes that discover and orchestrate tool nodes
---

# Agent Nodes

A small archetype (5 node dirs on develop: `agent_rocketride`, `agent_langchain`,
`agent_crewai`, `agent_deepagent`, `agent_llamaindex`) with the largest design surface.
**Phase 2 (brainstorm) is a real design conversation here, never a thin pass** — plan for deep
research in Phase 1 and the most build phases (5+) of any archetype.

## Reference nodes

- `nodes/src/nodes/agent_rocketride/` — native multi-module agent: `planner.py`,
  `executor.py`, `formatters.py` + thin IGlobal/IInstance. The module split is the pattern:
  planning, execution, and formatting are separately testable.
- `nodes/src/nodes/agent_langchain/`, `agent_llamaindex/`, `agent_crewai/` — framework-wrapper
  precedents (relevant when the ask is "integrate framework X").

## services.json distinctives

- `classType: ["agent", "tool"]` (agent_rocketride declares both); lanes `questions → answers`.
- Config sets the reasoning model, iteration/turn limits, and tool exposure controls.

## How agents meet tools (control plane, not lanes)

Tool nodes wired to an agent on the canvas are discovered at runtime via the invoke surface:
`tool.query` enumerates available tools (their `@tool_function` schemas + descriptions),
`tool.validate` / `tool.invoke` call them (`ToolsBase.handle_invoke` routing in
`packages/ai/src/ai/common/tools.py`). The agent never imports tool nodes — it sees whatever
the user wired in.

## Gotchas

- Tool descriptions are your prompt material — the agent is only as good as the wired tools'
  schemas. Don't compensate for bad tool descriptions inside the agent; fix the tool node.
- Enforce hard iteration/turn limits and per-tool-call timeouts; an agent node that can loop
  forever stalls the whole pipeline.
- Token budgets: the agent's transcript grows per turn — cap and summarize.
- Keep planner/executor logic engine-free (helper modules) so the reasoning loop is
  unit-testable with stubbed tools; test multi-turn sequences, tool-error recovery, and the
  no-tools-wired case.
- Don't hardcode a vendor LLM — use the configured model like the existing agents do.
- Framework wrappers (langchain-style): pin dependency versions tightly in the node's
  `requirements.txt`; framework drift is the maintenance cost.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
