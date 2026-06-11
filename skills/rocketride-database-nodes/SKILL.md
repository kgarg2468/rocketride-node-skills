---
name: rocketride-database-nodes
description: Use when building a relational database node (db_*) for rocketride-server — SQL engines, NL-to-SQL, and hosted flavors like Supabase, Neon, or RDS
---

# Relational Database Nodes

## THE rule of this archetype

**A hosted flavor of an existing engine is NOT a new node.** Supabase/Neon/RDS are Postgres →
they are a `services.<flavor>.json` + `<flavor>.svg` **inside `db_postgres/`** (see
`db_postgres/services.supabase.json` on origin/develop). PR #1063 died building an MCP-client
clone for a "Supabase node" ask. Before scaffolding anything, answer: *is the wire protocol an
engine we already speak?* If yes → variant file. Raise this at Gate A explicitly.

## Reference nodes

- `nodes/src/nodes/db_postgres/` — canonical (incl. the supabase variant pattern)
- `db_mysql/`, `db_clickhouse/`, `db_neo4j/` — other engines for triangulation

## Base classes

`packages/ai/src/ai/common/database/`:
- `DatabaseGlobalBase` (ABC, `db_global_base.py:66`) — implement exactly two abstract methods:
  - `_connection_params(config) -> dict` — map config keys (`db_postgres.host`, `.user`,
    `.password`, `.database`, `.table`) to a flat dict
  - `_build_connection_url(params) -> str` — the SQLAlchemy DSN
    (`postgresql+psycopg2://user:pass@host/db`) — **URL-encode credentials**
  - optional overrides: `_max_validation_attempts()`, `_db_description()`
- `DatabaseInstanceBase` (`db_instance_base.py`) — IInstance is ~10 lines (declare the dialect);
  all lane/tool logic is inherited: schema reflection, NL-to-SQL, EXPLAIN-based validation,
  dynamic table creation.

## services.json distinctives

- Dual `classType: ["database","tool"]` — pipeline node AND agent-callable tool.
- Connection form fields: host, user, password (`secure: true` + password widget), database,
  table. Controls: `allowExecute`, `maxValidationAttempts`, `maxExecuteRows`.

## Gotchas

- Never log the connection URL (it embeds credentials); `endGlobal()` clears params.
- The inherited NL-to-SQL path validates queries with EXPLAIN before executing — don't bypass.
- Write access is gated by `allowExecute` — default it off.
- A new engine = new node only when SQLAlchemy has a dialect for it; the node is mostly the DSN
  builder + dialect quirks.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
