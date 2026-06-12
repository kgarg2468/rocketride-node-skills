#!/usr/bin/env bash
# Skill-Bench driver v2: arm-aware (GREEN/RED), multi-turn, budget-capped.
# Usage: driver.sh <scenario.json> <seed-label> [--null-baseline]
#
# GREEN arm: the 13 rocketride-* skills are copied into the sandbox as PROJECT skills.
# RED arm (--null-baseline): identical invocation, no skills mounted.
# Both arms run --setting-sources project,local so ~/.claude (user skills/settings) is
# masked — the ONLY delta between arms is the 13 skills. Never touch ~/.claude/skills:
# the live skill watcher would propagate changes into concurrently-running sessions.
set -euo pipefail

SCENARIO_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
SEED="${2:-a}"
MODE=green
case "${3:-}" in --null-baseline|red) MODE=red;; esac

BENCH=/tmp/skill-bench
RR="$BENCH/rocketride-server"
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$(dirname "$BENCH_SRC")/skills"
MODEL="${SKILL_BENCH_MODEL:-claude-fable-5[1m]}"
TURN_BUDGET="${SKILL_BENCH_TURN_BUDGET:-8}"

ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$SCENARIO_FILE")
NTURNS=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d.get('turns') or [d['prompt']]))" "$SCENARIO_FILE")

[ -d "$RR" ] || { echo "FATAL: bench clone missing at $RR" >&2; exit 1; }

RUN="$BENCH/runs/$ID-$SEED-$MODE"
rm -rf "$RUN"
mkdir -p "$RUN/.claude" "$RUN/.bench"
cp "$BENCH_SRC/sandbox/settings.json" "$RUN/.claude/settings.json"
cp "$BENCH_SRC/sandbox/log_tool.py" "$RUN/.bench/log_tool.py"
cp "$SCENARIO_FILE" "$RUN/.bench/scenario.json"
echo "$MODE" > "$RUN/.bench/arm"

if [ "$MODE" = green ]; then
  mkdir -p "$RUN/.claude/skills"
  for d in "$SKILLS_SRC"/rocketride-*/; do
    cp -R "$d" "$RUN/.claude/skills/$(basename "$d")"
  done
fi

echo "[skill-bench] $ID seed=$SEED arm=$MODE turns=$NTURNS model=$MODEL"
cd "$RUN"

SESSION_ID=""
FINAL_RC=0
for i in $(seq 1 "$NTURNS"); do
  MSG=$(python3 -c "
import json, sys
d = json.load(open('.bench/scenario.json'))
print((d.get('turns') or [d['prompt']])[int(sys.argv[1]) - 1])" "$i")
  EXPECT=$(python3 -c "
import json, sys
d = json.load(open('.bench/scenario.json'))
e = d.get('expect') or []
i = int(sys.argv[1]) - 1
print(e[i] if i < len(e) else '')" "$i")
  RESUME_OPT=""
  [ -n "$SESSION_ID" ] && RESUME_OPT="--resume $SESSION_ID"
  echo "[skill-bench] turn $i/$NTURNS: ${MSG:0:70}"
  set +e
  # shellcheck disable=SC2086  # RESUME_OPT intentionally unquoted (uuid has no spaces)
  ROCKETRIDE_SERVER_DIR="$RR" claude -p "$MSG" $RESUME_OPT \
    --output-format json \
    --permission-mode acceptEdits \
    --max-turns 250 \
    --max-budget-usd "$TURN_BUDGET" \
    --setting-sources project,local \
    --strict-mcp-config \
    --model "$MODEL" \
    --add-dir "$RR" \
    > ".bench/result-$i.json" 2> ".bench/stderr-$i.log"
  RC=$?
  set -e
  [ -s ".bench/result-$i.json" ] && cp ".bench/result-$i.json" .bench/result.json
  if [ "$RC" -ne 0 ] || [ ! -s ".bench/result-$i.json" ]; then
    echo "[skill-bench] turn $i FAILED rc=$RC"
    tail -3 ".bench/stderr-$i.log" 2>/dev/null || true
    FINAL_RC=$RC; [ "$FINAL_RC" -eq 0 ] && FINAL_RC=1
    break
  fi
  read -r SESSION_ID SUBTYPE COST <<< "$(python3 -c "
import json
r = json.load(open('.bench/result-$i.json'))
print(r.get('session_id') or '-', r.get('subtype') or '-', r.get('total_cost_usd') or 0)")"
  printf '%s\t%s\t%s\t%s\n' "$i" "$SUBTYPE" "$SESSION_ID" "$COST" >> .bench/turns.tsv
  if [ "$SUBTYPE" != "success" ] || [ "$SESSION_ID" = "-" ]; then
    echo "[skill-bench] turn $i subtype=$SUBTYPE — stopping"; FINAL_RC=3; break
  fi
  if [ -n "$EXPECT" ]; then
    if ! python3 -c "
import json, re, sys
r = json.load(open('.bench/result-$i.json'))
sys.exit(0 if re.search(sys.argv[1], r.get('result') or '', re.I) else 1)" "$EXPECT"; then
      echo "[skill-bench] turn $i: expected marker /$EXPECT/ missing — early stop"
      FINAL_RC=2; break
    fi
  fi
done

echo "[skill-bench] done rc=$FINAL_RC run=$RUN"
exit $FINAL_RC
