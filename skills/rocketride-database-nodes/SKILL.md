---
name: rocketride-database-nodes
description: Use when building a database node (db_*) for rocketride-server — SQL engines, non-SQL database/tool nodes such as ArangoDB, NL-to-query, and hosted flavors like Supabase, Neon, or RDS
---

# Database Nodes

## THE rule of this archetype

**A hosted flavor of an existing engine is NOT a new node.** Supabase/Neon/RDS are Postgres →
they are a `services.<flavor>.json` + `<flavor>.svg` **inside `db_postgres/`** (see
`db_postgres/services.supabase.json` on origin/develop). PR #1063 died building an MCP-client
clone for a "Supabase node" ask. Before scaffolding anything, answer: *is the wire protocol an
engine we already speak?* If yes -> variant file. Raise this at Gate A explicitly.

## Reference nodes

- `nodes/src/nodes/db_postgres/` — canonical SQL/base-class pattern (incl. the supabase variant)
- `db_mysql/`, `db_clickhouse/`, `db_neo4j/` — other engines for triangulation
- `db_arango/` — non-SQL database/tool precedent; custom query/client path when the SQL base
  does not fit

## Choose the database pattern first

1. **Hosted flavor of an existing engine** — add `services.<flavor>.json` and icon inside the
   existing node (`db_postgres/services.supabase.json` style). No new node.
2. **SQL engine with SQLAlchemy/dialect fit** — use the SQL base classes below; the node is
   mostly config mapping, DSN construction, and dialect quirks.
3. **Non-SQL or multi-model DB** — do not force `DatabaseGlobalBase`. Use `db_arango` as the
   precedent: dual database/tool classType, node-local client/query handling, explicit query
   safety, and focused unit/live harness coverage.

## SQL base classes

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
  table/collection as appropriate. Controls commonly include execution gates such as
  `allowExecute`, validation attempts, and row/result limits.
- Capabilities are precedent-driven; do not add `"experimental"` by reflex.

## Gotchas

- Never log the connection URL (it embeds credentials); `endGlobal()` clears params.
- SQL-base nodes inherit NL-to-SQL validation with EXPLAIN before executing — don't bypass it.
- Non-SQL nodes need their own equivalent safety story: read-only defaults, explicit execute
  gates, result limits, and query/error normalization.
- Write access is gated by `allowExecute` or the node's equivalent — default it off.
- Service-level test blocks may be weak for DB nodes when there is no useful mock driver. If so,
  document the omission and make unit tests plus a live harness carry the risk; do not pretend
  `builder nodes:test` covered live DB behavior.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
