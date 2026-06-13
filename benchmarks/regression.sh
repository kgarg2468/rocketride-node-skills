#!/usr/bin/env bash
# Skill-Bench REGRESSION GATE — run after every skill edit.
# Four highest-signal scenarios, GREEN, ONE seed each on the happy path:
#   s1 menu · s2 exists-trap · s7 parser(carve-out/icon) · s8 gate-under-pressure
#
# Variance filter: a scenario that FAILS its first seed is retried for 2 more; it only hard-fails
# if it misses the MAJORITY (>=2 of 3) — matching the systematic-vs-variance rule, so a single
# unlucky seed (e.g. sonnet occasionally dropping Mistral's QnA op) doesn't false-red the gate.
# Exit 0 iff every scenario passes. Usage: [SKILL_BENCH_MODEL=...] [FORCE=1] regression.sh
set -uo pipefail
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIOS=(s1-multiop-textract s2-exists-tavily s7-parser-mistralocr s8-redteam-skipgates)

run_and_judge() {  # $1=scenario $2=seed  -> echoes "PASS/FAIL/INFRA reason", returns judge rc
  local s="$1" seed="$2" rd="/tmp/skill-bench/runs/$1-$2-green" sc
  sc="$rd/.bench/scorecard.json"
  if [ "${FORCE:-0}" != "1" ] && [ -f "$sc" ] && \
     python3 -c "import json,sys;d=json.load(open(sys.argv[1]));sys.exit(0 if not d.get('infra_invalid') and d.get('subtype')=='success' else 1)" "$sc" 2>/dev/null; then
    : # reuse existing valid run
  else
    FORCE=1 "$BENCH_SRC/driver.sh" "$BENCH_SRC/scenarios/$s.json" "$seed" >/dev/null 2>&1 || true
    python3 "$BENCH_SRC/analyze.py" "$rd" >/dev/null 2>&1 || true
  fi
  python3 "$BENCH_SRC/judge.py" "$rd"
}

echo "== Skill-Bench regression gate (best-of-3 on failure) =="
ALLPASS=1
for s in "${SCENARIOS[@]}"; do
  out=$(run_and_judge "$s" reg); rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "  PASS   $s — ${out#PASS }"; continue
  fi
  # First seed failed/infra — retry twice, require majority of 3.
  echo "  retry  $s (seed 1: ${out}) — running 2 more for majority"
  passes=0; [ "$rc" -eq 0 ] && passes=1
  details="seed1:[$out]"
  for seed in reg2 reg3; do
    o=$(run_and_judge "$s" "$seed"); r=$?
    details="$details $seed:[$o]"
    [ "$r" -eq 0 ] && passes=$((passes + 1))
  done
  if [ "$passes" -ge 2 ]; then
    echo "  PASS   $s — $passes/3 seeds pass (first-seed miss = variance) | $details"
  else
    echo "  FAIL   $s — only $passes/3 seeds pass (SYSTEMATIC) | $details"
    ALLPASS=0
  fi
done
echo "== REGRESSION $([ "$ALLPASS" -eq 1 ] && echo 'PASS ==' || echo 'FAIL ==')"
[ "$ALLPASS" -eq 1 ]
