#!/usr/bin/env bash
# Skill-Bench driver: run one scenario seed headlessly in a disposable sandbox.
# Usage: driver.sh <scenario.json> <seed-label>
set -euo pipefail

SCENARIO_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
SEED="${2:-a}"
BENCH=/tmp/skill-bench
RR="$BENCH/rocketride-server"
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # benchmarks/

ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$SCENARIO_FILE")
PROMPT=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['prompt'])" "$SCENARIO_FILE")

[ -d "$RR" ] || { echo "FATAL: bench clone missing at $RR" >&2; exit 1; }

RUN="$BENCH/runs/$ID-$SEED"
rm -rf "$RUN"
mkdir -p "$RUN/.claude" "$RUN/.bench"
cp "$BENCH_SRC/sandbox/settings.json" "$RUN/.claude/settings.json"
cp "$BENCH_SRC/sandbox/log_tool.py" "$RUN/.bench/log_tool.py"
cp "$SCENARIO_FILE" "$RUN/.bench/scenario.json"

echo "[skill-bench] $ID seed=$SEED → $RUN"
echo "[skill-bench] prompt: $PROMPT"

cd "$RUN"
set +e
ROCKETRIDE_SERVER_DIR="$RR" claude -p "$PROMPT" \
  --output-format json \
  --permission-mode acceptEdits \
  --max-turns 250 \
  --add-dir "$RR" \
  --add-dir "$(dirname "$BENCH_SRC")" \
  > .bench/result.json 2> .bench/stderr.log
RC=$?
set -e

echo "[skill-bench] claude exit=$RC"
if [ -s .bench/result.json ]; then
  python3 -c "
import json
r = json.load(open('.bench/result.json'))
print('[skill-bench] session_id:', r.get('session_id'))
print('[skill-bench] subtype:', r.get('subtype'), '| turns:', r.get('num_turns'),
      '| cost_usd:', r.get('total_cost_usd'), '| duration_s:', round((r.get('duration_ms') or 0)/1000))
"
else
  echo "[skill-bench] EMPTY result.json — see $RUN/.bench/stderr.log"
  tail -5 .bench/stderr.log || true
fi
exit $RC
