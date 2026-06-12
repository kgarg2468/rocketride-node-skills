# Skill-Bench — regression harness for the rocketride node skills

Simulated node builds, run headlessly, graded at the skill's own gates. Nothing is ever shipped:
no issues, no PRs, no pushes. Each scenario is a real `claude -p` session in a disposable
sandbox under `/tmp/skill-bench/runs/`, driven by canned "user" replies at the gates.

## Tiers

| Tier | Turns | Stops at | Cost | What it tests |
|---|---|---|---|---|
| 1 | 1 | **Gate A** | low | research quality, full operation menu, archetype, exists-check |
| 2 | 2 ("go") | **Gate B/C** | med | mockup: services.json decisions, blast radius, phases |
| 3 | 3+ ("go", "4 — local only") | **Gate D** | high | the build itself, validation honesty, close-out |

## Run

```bash
./driver.sh scenarios/s1-multiop-textract.json a     # scenario, seed label
python3 analyze.py /tmp/skill-bench/runs/s1-multiop-textract-a
```

One-time setup: clone rocketride-server to `/tmp/skill-bench/rocketride-server` with origin set
to `rocketride-org/rocketride-server` and `origin/develop` fetched. The driver points
`ROCKETRIDE_SERVER_DIR` at it (repo-setup.md resolves that env var first).

Run each scenario with ≥2 seeds: ≥2/2 fail = systematic (skill gap) → fix the skill text;
1/2 fail = variance → consider a forcing function in the skill.

## Observability

- **Transcript (authoritative):** `~/.claude/projects/<sandbox-slug>/<session_id>.jsonl` — every
  tool call, every file read, every command. `analyze.py` parses this.
- **PreToolUse hook log (belt-and-braces):** `.bench/tool_calls.jsonl` in the sandbox. Hooks from
  project settings may not fire in headless mode — that's fine, the transcript covers it.
- **result.json:** final text, session_id, cost, turns, duration, model usage.

Key derived metrics: ops coverage vs ground truth · gate hard-stop respected · exists-census
ran · skill-file coverage (which of the 24 files were actually read) · mutation attempts
(must be 0) · claimed-vs-ran honesty (Tier 3).

## Safety model (and its limits)

- Sandbox `.claude/settings.json` DENIES: `git push`, `git commit`, and every mutating `gh`
  subcommand (`pr create/edit/comment/merge/ready/close`, `issue create/edit/comment`,
  `repo fork`, `api`, `auth`).
- Deny rules are **prefix-matched** — `git -C <path> push` would evade `Bash(git push:*)`.
  Mitigations: the bench clone has **no fork remote**, pushing to origin 403s (no org write
  access), and Tiers 1–2 end long before the shipping skill. Tier 3 scripted close-out is
  always "local branch only".
- Live vendor calls are never part of automated tiers (the skills' own default gates are
  network-free).

## Scenario format (JSON)

```json
{
  "id": "s1-...", "tier": 1,
  "prompt": "i want to add a node for <vendor>",
  "ground_truth": {
    "exists_on_develop": false,
    "expected_archetype": "...",
    "required_ops": {"OpName": ["alias", "alias2"]},   // normalized-substring aliases
    "bonus_ops": {"OpName": ["alias"]}
  },
  "rubric": ["human-graded criteria, one per line"]
}
```

`required_ops` aliases are matched against the final gate message after normalization
(lowercase, strip non-alphanumeric) — pick aliases accordingly.
