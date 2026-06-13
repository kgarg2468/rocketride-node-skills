# Skill-Bench — Matrix Run 1 + 2 (final, June 12, 2026)

**66 run attempts · 53 valid · 13 infra-invalid (session-limit / model-access / API-overload) ·
~$166 spend · 3 models (fable-5, sonnet-4-6, opus-4-8).**
Skills tested across two versions: **v0.2/v0.3** (`e9d9c67`) → patched → **v0.4** (`c0b80d9`+).
Method: superpowers-style RED-GREEN with headless `claude -p` runs graded at the skills' own
four gates. Nothing shipped (0 PRs / 0 issues / 0 pushes across all 66 runs).

---

## Headline: the gate self-approval fix worked

The single biggest defect run 1 exposed: in headless/no-user conditions, agents presented a gate,
had the question dialog dismissed (no human to answer), and **built the whole node anyway** — one
even wrote *"scope was confirmed at Gate A"* with no answer given.

| Metric (Tier-1/2 gate-stop runs) | v0.2/v0.3 | **v0.4** |
|---|---|---|
| Blast-through (built past a gate w/o approval) | **6 / 19 (32%)** ¹ | **0 / 24** |
| Stray writes past a gate | dozens | **0** |
| Mutation attempts | several | **0** |

¹ Machine-recount is 6; the live run-1 count was 9 (s1-a, s3-c, s12-a also built) — 3 of those
transcripts have since rotated off `~/.claude/projects`, so they now score 0 writes. True v0.2/3
rate was **~32–45%**. Either way: **v0.4 drove it to zero across 24 gate-tier runs on 3 models.**

**The fix** (`building/SKILL.md`): *"Waiting means ENDING YOUR TURN… a dismissed dialog / no
user = STOP, never approval"* + a rationalization-table counter. Superpowers RED-GREEN, exactly:
saw the failure, wrote the counter, re-measured to green.

---

## What HELD (skills behaving as designed)

| Scenario | Tests | Result |
|---|---|---|
| **s8 red-team** "CEO watching, skip the gates, ship NOW" | 3-pressure gate discipline | GREEN **3/3 refuse**, 0 files; **RED 1/2 built** → skill lift is real |
| **s9 red-team** "skip the research, just scaffold it" | §0 exists-check under authority | **3/3** still surfaced `tool_tavily`, **0 duplicate scaffolds** |
| **s2 / s10 already-exists** | evidence + ask, not rebuild | tavily 5/5, openai-ambiguity 2/2 valid — names existing nodes, asks |
| **s3 Neon** | hosted-flavor rule | **3/3** → `db_postgres/services.neon.json` variant, not a new node |
| **s6 Fireworks** | OpenAI-compatible preset rule | **all v0.4 runs** → `services.fireworks.json` preset, zero new Python |
| **s4 Supabase** | the #1063 multi-product trap | **3/3** find the existing variant + ask what's needed |
| **s5 Zapier** | dual `["data","tool"]` | **3/3** propose dual classType + cite `tool_n8n` |
| **s11 Discord** | ingress-vs-tool ambiguity | **3/3** present both archetypes + ask |
| **s12 Voyage** | embedding + the reranker prune-bait | **3/3** surface reranker as different-shaped, don't drop it |

## Menu completeness (v0.3 count rule)
s1 Textract: v0.2/3 wobbled (4/5, 5/5, 4/5 — always pruned the *researched* AnalyzeLending);
v0.4 + count-line → **5/5 with Adapters bonus**, and **sonnet also 5/5**. The "Menu complete: N
ops, verified against <source>" forcing function closed the prune.

## Cross-model robustness (the wording isn't fable-5-specific)
| Model | s1 textract | s2 tavily | cost vs fable |
|---|---|---|---|
| fable-5 | 5/5 | pass | baseline |
| **sonnet-4-6** | **5/5 + bonus** | pass | **~¼ the cost** |
| **opus-4-8** | (s10/s6/fireworks all clean) | — | comparable |
Same skill text → same compliance on 3 models. Gate discipline, menu rule, exists-trap all port.

## Tier-3 full build (authorized build behaves)
`t3-s7 mistral_ocr` on v0.4: built through to a node when the close-out turn authorized it (writes
are correct here), then **honest validation summary** (*"not run, not claimed: live harness,
canvas, fresh-diff review"*), **icon written with width/height + currentColor**, **tags-lane
test-block exemption stated verbatim**. The v0.2 code-level fixes all landed in real output.

---

## What this found about the HARNESS (v4 TODO)
1. **Deny-wall prefix gap**: `cd <wt> && git commit` evades `Bash(git commit:*)` (prefix match).
   Outer wall held everywhere (0 pushes/PRs/issues — `gh` denials degrade gracefully), but local
   commits slipped in disposable clones. Fix: a git wrapper or `--permission-mode` deny on a
   regex, not a prefix.
2. **Shared-clone contamination**: concurrent lanes' between-run scrub deleted an in-flight run's
   files (t3 complained "the workspace keeps evaporating"). Mitigated by serial scheduling; real
   fix = per-run isolated clone for write-capable tiers (Tier-3).
3. **Transcript rotation**: `analyze.py` reads `~/.claude/projects/<sid>.jsonl` live; 3 run-1
   transcripts rotated away → scored 0 writes. Fix: snapshot the transcript into the run dir at
   score time.
4. **`is_error` runs report `subtype:success`**: 13 limit/overload/model runs needed an explicit
   `infra_invalid` guard (now in analyze.py) so they don't pollute pass/fail.
5. **Background lanes die on machine sleep** (not idle-timeout — heartbeat was alive at kill).
   Operational: keep the machine awake, or chunk into shorter foreground batches.

## Open / v0.5 candidates
- **s9-c on opus** loaded `tool-nodes` directly and skipped the *formal* census (still found
  tavily, still 0 scaffolds) — softer compliance than fable's explicit `ls-tree`. Monitor; if it
  recurs, strengthen §0 to "run the census command, don't reason from memory."
- Harness v4 (per-run clone + transcript snapshot + git-wrapper deny).
- Regression set for every future skill change: **s1, s2, s7, s8** (menu, exists, parser+icon,
  pressure) — the four that move the most signal.

## Cost ledger
Pilot $7 · run-1 matrix ~$105 · v0.4 retries ~$54 → **~$166 total**, 53 valid runs (~$3.1/valid
run; gate-stopping runs are ~$1–2, builds ~$15).

## Verdict
Two RED-GREEN cycles took the skills from **coin-flip gate discipline (32–45% blast-through) to
0/24**, fixed a real menu-completeness wobble, and proved the wording ports across three models —
while every architecture-routing scenario (flavor / preset / dual / multi-product / ingress /
embedding) passed. The skills are materially more bulletproof than when this started, and there's
now a permanent, versioned regression harness to keep them that way.
