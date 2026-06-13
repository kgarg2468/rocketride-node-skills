#!/usr/bin/env bash
# Skill-Bench lane runner v4: runs a manifest SEQUENTIALLY, never stops on a single failure,
# RESUMABLE (skips runs already completed valid — survives sleep-kills), self-isolating driver
# (no shared-clone scrub; each run owns a worktree).
# Usage: [FORCE=1] lane.sh <lane-name> <manifest-file>
#   Manifest line:  <scenario-basename.json> <seed> [red] [model=<model-id>]
set -uo pipefail

LANE="$1"
MANIFEST="$2"
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEDGER=/tmp/skill-bench/ledger.tsv
FORCE="${FORCE:-0}"

already_done() {  # $1=scenario.json $2=seed $3=arm(green|red)
  local id rundir sc
  id=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['id'])" "$BENCH_SRC/scenarios/$1" 2>/dev/null) || return 1
  rundir="/tmp/skill-bench/runs/$id-$2-$3"
  sc="$rundir/.bench/scorecard.json"
  [ -f "$sc" ] || return 1
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if not d.get('infra_invalid') and d.get('subtype')=='success' else 1)" "$sc" 2>/dev/null
}

while read -r SCEN SEED ARG3 ARG4; do
  [ -z "${SCEN:-}" ] && continue
  case "$SCEN" in \#*) continue;; esac
  ARM_FLAG=""; ARM=green; MODEL_ENV=""
  for a in "${ARG3:-}" "${ARG4:-}"; do
    case "$a" in
      red) ARM_FLAG="--null-baseline"; ARM=red;;
      model=*) MODEL_ENV="${a#model=}";;
    esac
  done
  if [ "$FORCE" != "1" ] && already_done "$SCEN" "$SEED" "$ARM"; then
    echo "[lane:$LANE] SKIP $SCEN $SEED ($ARM) — already valid"
    continue
  fi
  START=$(date +%s)
  if [ -n "$MODEL_ENV" ]; then
    SKILL_BENCH_MODEL="$MODEL_ENV" "$BENCH_SRC/driver.sh" "$BENCH_SRC/scenarios/$SCEN" "$SEED" $ARM_FLAG
  else
    "$BENCH_SRC/driver.sh" "$BENCH_SRC/scenarios/$SCEN" "$SEED" $ARM_FLAG
  fi
  RC=$?
  DUR=$(( $(date +%s) - START ))
  # Score immediately so resumability + aggregation see it without a separate pass.
  python3 "$BENCH_SRC/analyze.py" "/tmp/skill-bench/runs/$(python3 -c "import json;print(json.load(open('$BENCH_SRC/scenarios/$SCEN'))['id'])")-$SEED-$ARM" >/dev/null 2>&1 || true
  printf '%s\t%s\t%s\t%s\t%s\t%ss\n' "$LANE" "$SCEN" "$SEED" "$ARM${MODEL_ENV:+ $MODEL_ENV}" "rc=$RC" "$DUR" >> "$LEDGER"
  echo "[lane:$LANE] $SCEN $SEED rc=$RC ${DUR}s"
done < "$MANIFEST"
echo "[lane:$LANE] COMPLETE"
