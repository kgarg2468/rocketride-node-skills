# E2E audit checklists

Two audits. The per-phase audit runs after EVERY build phase; the final massive e2e runs once,
when all phases are done, and is the merge-readiness bar.

This is an audit reference, not a shipping action: it neither requires a PR nor invokes shipping.

## Per-phase audit (scoped to this phase's changes)

- [ ] `uvx ruff check` + `uvx ruff format --check` on every file touched this phase
- [ ] The node's unit-test file passes — including new tests written *in this phase* for this
      phase's features
- [ ] Full contract suite if services.json changed this phase:
      `uvx --python 3.11 --with pytest --with pytest-asyncio pytest nodes/test/test_contracts.py`
- [ ] Re-read every changed file against the archetype skill's contracts (lane lifecycle /
      tool conventions / base-class obligations)
- [ ] services.json changes still match `docs/README-node-schema.md`
- [ ] No secrets, no real API keys, no mutation of inputs introduced
- [ ] Evidence is recorded for every applicable risk/effect-map row; an N/A row has its concrete
      reason and no untested route remains
- [ ] **Scope check:** only THIS phase's planned scope was implemented — if you find yourself
      auditing features from a later phase, you collapsed phases; say so and audit them all
- [ ] Fix-and-rerun until clean — do not start the next phase with a red audit

## Final massive e2e (merge readiness)

**Static:**
- [ ] ruff clean on the whole node dir + all touched test paths
- [ ] Full unit suite + full `test_contracts.py` pass
- [ ] `./builder nodes:test`, `./builder nodes:test-full` when full/heavy cases exist, and
      `./builder nodes:test-contracts` — record the exact commands and any fallback honestly
- [ ] License header on every `.py` file
- [ ] `requirements.txt` present only when node-local deps or `depends()` bootstrap need it;
      otherwise the mockup/validation summary explains why it is omitted
- [ ] Optional dependencies satisfy their documented minimum supported versions and the
      CI-equivalent optional-dependency path was checked
- [ ] `README.md` present with generated marker blocks for the public node docs page; no
      mandatory `doc.md` unless intentionally kept as supplemental legacy docs
- [ ] README includes the required public-docs sections from `planning-nodes/docs-page.md`
      and cites upstream vendor/API docs
- [ ] Generated marker block is valid: exactly one START and END marker, START before END, no
      hand-edited generated content claim
- [ ] `./builder nodes:docs-generate` was run after services.json/docs changes, or the validation
      summary states why marker contents were not refreshed locally
- [ ] Icon: SVG co-located, explicit `width`+`height` on the root `<svg>` (missing = renderer
      silently falls back to a chain-link), `viewBox`, `fill="currentColor"`, no `fill="#000"`
- [ ] Secure-field audit: `secure: true` + ApiKeyWidget on every secret, env fallback in
      IGlobal, no real defaults, `endGlobal()` clears secrets
- [ ] `prefix` uniqueness: grep the catalog
- [ ] Lane wiring valid against the ontology in `docs/README-nodes.md`
- [ ] services.json `test` block present when the framework can drive the node; if omitted,
      the validation summary states the concrete reason (binary/parser-only, DB/no useful mock,
      heavy model, etc.)
- [ ] Service tests use current schema correctly: `fulltest`, `requiresLibs`, `avoidMocks`,
      profiles/controls/chain/outputs/timeout/cases as applicable
- [ ] Secret scan: no credentials anywhere. ⚠️ New (uncommitted) files are invisible to
      `git diff origin/develop...` — run `git add -N <new files>` first so the diff includes
      them, then `git diff origin/develop... | grep -iE 'key|token|secret'` eyeball

**Behavioral:**
- [ ] Live vendor harness (ladder rung 5) if feasible — fresh from-scratch seed, not a reused
      warm environment; count and report checks ("15/15")
- [ ] Offer the live-engine/IDE canvas walk-through to the user (rung 7) — it passes only when
      the **actual output payload** was seen (non-empty, expected shape), never on green
      lifecycle rows alone

**Ship-ready UX gate (outside-user polish — a real user will see this):**
- [ ] Icon/logo present and referenced by filename in services.json; renders in the Add-Node
      palette and on the canvas, not the chain-link fallback (format rules in the Static icon check)
- [ ] Discoverable: the node appears in Add-Node search under its intended displayName + category;
      name/prefix is a real identifier, not a placeholder
- [ ] Config panel renders cleanly: every field has a human label + help text, secrets show the
      ApiKeyWidget, no `TODO`/`lorem`/leftover placeholder copy
- [ ] Display metadata reads like other shipped nodes: displayName, description, and category are
      user-facing prose, not the vendor's raw slug
- [ ] Canvas smoke: wire a minimal pipe (e.g. Chat -> node -> Response), fill config, run — the node
      shows its icon, connects on the intended lanes, and returns a real payload
- [ ] README/example gives an outside user a working first pipeline
- [ ] Documentation claims about reversibility, recovery, idempotency, and destruction match
      observed behavior; remove or qualify any claim not demonstrated

**Review:**
- [ ] Self code review of `git diff origin/develop...` (after `git add -N` so new files show)
      — read it as a hostile reviewer: error semantics, input guards, secrets, dead code,
      stale comments
- [ ] Before Gate D, obtain a fresh-context independent review when the risk/effect map flags a
      protected outcome, persisted state, shared-code edit, or copied-client lineage. Prefer a
      different model family; verify each finding and record its disposition. For a simple
      read-only node with every trigger genuinely N/A, mark this check N/A.
- [ ] Public docs/LLM surface plan is stated for after merge: check
      `https://docs.rocketride.org/llms.txt` and `https://docs.rocketride.org/nodes/<node>.md`
      once docs deploy
- [ ] `git status` shows ONLY intended files
- [ ] Validation summary records honest checkboxes (what ran, what did not)
