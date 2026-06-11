# E2E audit checklists

Two audits. The per-phase audit runs after EVERY build phase; the final massive e2e runs once,
when all phases are done, and is the merge-readiness bar.

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
- [ ] **Scope check:** only THIS phase's planned scope was implemented — if you find yourself
      auditing features from a later phase, you collapsed phases; say so and audit them all
- [ ] Fix-and-rerun until clean — do not start the next phase with a red audit

## Final massive e2e (merge readiness)

**Static:**
- [ ] ruff clean on the whole node dir + test file
- [ ] Full unit suite + full `test_contracts.py` pass
- [ ] `./builder nodes:test` / `nodes:test-contracts` — try them (they often run without the
      C++ toolchain); if one fails on toolchain, record the degrade honestly (SKILL.md rung 4)
- [ ] License header on every `.py` file
- [ ] `requirements.txt` present (commented if empty)
- [ ] Icon: SVG co-located, `fill="currentColor"`, no `fill="#000"`
- [ ] Secure-field audit: `secure: true` + ApiKeyWidget on every secret, env fallback in
      IGlobal, no real defaults, `endGlobal()` clears secrets
- [ ] `prefix` uniqueness: grep the catalog
- [ ] Lane wiring valid against the ontology in `docs/README-nodes.md`
- [ ] services.json `test` block present
- [ ] Secret scan: no credentials anywhere. ⚠️ New (uncommitted) files are invisible to
      `git diff origin/develop...` — run `git add -N <new files>` first so the diff includes
      them, then `git diff origin/develop... | grep -iE 'key|token|secret'` eyeball

**Behavioral:**
- [ ] Live vendor harness (ladder rung 5) if feasible — fresh from-scratch seed, not a reused
      warm environment; count and report checks ("15/15")
- [ ] Offer the live-engine/IDE canvas walk-through to the user (rung 6)

**Review:**
- [ ] Self code review of `git diff origin/develop...` (after `git add -N` so new files show)
      — read it as a hostile reviewer: error semantics, input guards, secrets, dead code,
      stale comments
- [ ] `git status` shows ONLY intended files
- [ ] Validation summary drafted for the PR with honest checkboxes (what ran, what didn't)
