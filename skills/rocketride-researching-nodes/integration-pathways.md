# Integration pathways — is a fresh node even the right move?

Before proposing a bespoke node, decide the **least-code RocketRide-native pathway** that meets the
need. A fresh node is the last resort, not the default. This analysis runs during research and is
presented at **Gate 0 (Pathway)** — options + a recommendation; the user decides. Advisory: if the
user still wants a fresh node after seeing the options, build it — but they choose it, they don't
default into it.

Census the mechanisms at research time (`git -C "$REPO" ls-tree -d --name-only
origin/develop:nodes/src/nodes`); the node names/counts below drift. Rungs are ordered
least-code → most-code; recommend the highest rung that fully meets the need.

## The pathway ladder

1. **Already ships** — a node, variant, or preset already covers it → use it, zero code.
   (researching-nodes §0 exists-check.) Gate 0 becomes "here's what exists — what's missing?"

2. **Preset / hosted-flavor variant** — the vendor speaks a wire protocol RocketRide already
   implements → a `services.<flavor>.json` variant of the existing node, **not** a new node.
   - DB engines we speak: Neon/RDS/Supabase → `db_postgres`; others → the matching `db_*`.
   - OpenAI-compatible LLM API → `llm_openai_api` profile.
   - A specific **MCP server** → a `tool_mcp_client` variant (precedent:
     `tool_mcp_client/services.butterbase.json` + `butterbase.svg`).

3. **MCP bridge** — the vendor ships (or can run behind) a Model Context Protocol server → bridge it
   with **`tool_mcp_client`** (STDIO or HTTP transport) instead of hand-porting each endpoint as a
   bespoke tool. The bridge discovers the server's tools at pipeline start (`tools/list`) and exposes
   them to agents. Ship a preset variant (rung 2) for a popular server; otherwise the generic node is
   user-configured. Prefer this when the vendor's value is an agent-callable toolset it already
   exposes over MCP — many SaaS vendors now ship an official MCP server.

4. **Python / code wrap** — the need is agent-controlled compute or glue logic → **`tool_python`**
   (`python.execute`, restricted in-process sandbox). **Honest limits:** whitelisted modules only —
   arbitrary third-party vendor SDKs will **not** import, and there is **no subprocess/CLI** access.
   So "wrap vendor X's Python SDK" or "run CLI binary Y" is not a `tool_python` job; it needs a
   bespoke node (or a reviewed sandbox-whitelist change = blast radius). Use `tool_python` only for
   stdlib/whitelisted-module compute the agent drives.

5. **Fresh node** — none of the above fit (bespoke API surface, data-flow processing, streaming, a
   new archetype) → build the node via the normal archetype flow. This is the common, legitimate
   answer for most "add vendor X" asks; the ladder just makes it a **choice, not a reflex**.

## Presenting at Gate 0

State where the request lands, the **recommended** pathway and why, then the alternatives with their
tradeoffs. Cite evidence (the existing node/variant, the vendor's MCP server, the SDK). Wait for the
user — a recommendation is not a confirmation. If the recommended pathway is an existing
node / variant / MCP bridge, **do not scaffold a new node** until the user rejects those and
explicitly chooses a fresh node.

## Red flags

| Thought | Reality |
|---|---|
| "It's an API, so it's obviously a new tool node — scaffold it" | Check rungs 1–4 first. The vendor may already ship an MCP server (`tool_mcp_client`) or be a flavor of an engine we speak |
| "Use `tool_python` to wrap their SDK" | The sandbox whitelists modules; third-party SDKs don't import and there's no subprocess |
| "Recommend a fresh node" (without saying why 1–4 don't fit) | Name the rung you rejected and why, or you haven't done the analysis |
