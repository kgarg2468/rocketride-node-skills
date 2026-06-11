---
name: rocketride-ingress-nodes
description: Use when building a source/ingress node for rocketride-server (webhook, telegram class) — nodes that originate pipeline data from external triggers via an IEndpoint listener
---

# Source / Ingress Nodes

Nodes that **originate** data instead of transforming it. The rarest archetype and the one where
lifecycle mistakes hurt most: these run servers.

## Reference nodes

- `nodes/src/nodes/webhook/` — canonical. Note the **multi-variant pattern**: one codebase,
  three catalog entries (`services.webhook.json`, `services.chat.json`, `services.dropper.json`)
  with per-variant icons.
- `nodes/src/nodes/telegram/` — third-party-platform ingress.

## The IEndpoint contract

`IEndpoint(IEndpointBase)` in `IEndpoint.py` is the heart (webhook's spins up FastAPI/uvicorn):
`async _startup()` (bind the listener), `async _shutdown()` (release it), `_run()`,
`scanObjects(path, scanCallback)` (feed received objects into the pipeline).

## services.json distinctives

- `classType: ["source"]`; consumed lane is the special `_source` entry lane; produces whatever
  the trigger carries (questions/text/documents).
- `register` is endpoint-flavored, not plain filter — copy the reference manifest exactly.
- Inbound auth config (authorization keys/tokens): `secure: true` fields; the runtime publishes
  an interface URL + public authorization key when the pipeline runs.

## Gotchas

- **`OPEN_MODE.CONFIG` matters most here**: never bind ports, start servers, or register
  webhooks during canvas config mode. (The check pattern is in newer nodes, e.g.
  `pinecone/IGlobal.py`; webhook predates the convention — follow the convention, not webhook.)
- Ports are dynamic and contested (multiple engines/pipelines run concurrently) — never
  hardcode; surface the published interface URL instead of assuming one. uvicorn
  `sys.exit(1)` on startup = port conflict, not your bug.
- The listener exists only while the pipeline runs — document that for users (their external
  caller gets connection-refused otherwise).
- Validate/authenticate inbound requests before feeding `scanObjects`; never log inbound
  secrets.
- Inbound retries from callers can re-trigger side-effecting pipelines — note idempotency
  implications in the node README; ingress hardening (HMAC, dedup) is core/`packages/`
  territory → written suggestion, not an edit.

REQUIRED BACKGROUND: `rocketride-building-nodes` gotchas.md applies in full.
