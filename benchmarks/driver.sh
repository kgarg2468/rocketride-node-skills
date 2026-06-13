#!/usr/bin/env bash
# Skill-Bench driver v4: arm-aware, multi-turn, per-run isolated worktree, transcript snapshot.
# Usage: driver.sh <scenario.json> <seed-label> [--null-baseline]
#
# v4 changes:
#  - Each run gets its OWN git worktree off origin/develop (ROCKETRIDE_SERVER_DIR) — no shared
#    working tree, so concurrent runs can't scrub each other. Worktree removed after the run
#    (build evidence captured to .bench/ first).
#  - Transcript snapshotted into .bench/ after every turn (survives ~/.claude/projects rotation).
# GREEN copies the 13 skills into the sandbox as project skills; RED doesn't. Both arms run
# --setting-sources project,local so ~/.claude is masked — the only delta is the 13 skills.
set -euo pipefail

SCENARIO_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
SEED="${2:-a}"
MODE=green
case "${3:-}" in --null-baseline|red) MODE=red;; esac

BENCH=/tmp/skill-bench
SHARED="$BENCH/rocketride-server"               # object store + clone (read-only to runs)
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$(dirname "$BENCH_SRC")/skills"
MODEL="${SKILL_BENCH_MODEL:-claude-fable-5[1m]}"
TURN_BUDGET="${SKILL_BENCH_TURN_BUDGET:-8}"

ID=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$SCENARIO_FILE")
NTURNS=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d.get('turns') or [d['prompt']]))" "$SCENARIO_FILE")

[ -d "$SHARED" ] || { echo "FATAL: shared clone missing at $SHARED" >&2; exit 1; }
git -C "$SHARED" fetch -q origin develop 2>/dev/null || true

RUN="$BENCH/runs/$ID-$SEED-$MODE"
rm -rf "$RUN"
mkdir -p "$RUN/.claude" "$RUN/.bench"
cp "$BENCH_SRC/sandbox/settings.json" "$RUN/.claude/settings.json"
cp "$BENCH_SRC/sandbox/log_tool.py" "$RUN/.bench/log_tool.py"
cp "$SCENARIO_FILE" "$RUN/.bench/scenario.json"
echo "$MODE" > "$RUN/.bench/arm"
echo "$MODEL" > "$RUN/.bench/model"

if [ "$MODE" = green ]; then
  mkdir -p "$RUN/.claude/skills"
  for d in "$SKILLS_SRC"/rocketride-*/; do
    cp -R "$d" "$RUN/.claude/skills/$(basename "$d")"
  done
fi

# Per-run isolated worktree (detached HEAD = no branch collisions across concurrent runs).
REPO="$RUN/repo"
git -C "$SHARED" worktree add -q --detach "$REPO" origin/develop 2>/dev/null \
  || { echo "FATAL: worktree add failed" >&2; exit 1; }
cleanup() {
  # Capture build evidence before discarding the worktree.
  git -C "$REPO" add -A 2>/dev/null || true
  git -C "$REPO" diff --cached --stat origin/develop > "$RUN/.bench/build_files.txt" 2>/dev/null || true
  git -C "$SHARED" worktree remove --force "$REPO" 2>/dev/null || rm -rf "$REPO"
  git -C "$SHARED" worktree prune 2>/dev/null || true
}
trap cleanup EXIT

echo "[skill-bench] $ID seed=$SEED arm=$MODE turns=$NTURNS model=$MODEL (worktree)"
cd "$RUN"

snapshot_transcript() {  # $1 = session_id, $2 = turn index
  [ -z "$1" ] && return 0
  local src
  src=$(ls -t "$HOME/.claude/projects"/*/"$1.jsonl" 2>/dev/null | head -1)
  [ -n "$src" ] && cp "$src" "$RUN/.bench/transcript-$2.jsonl" 2>/dev/null || true
}

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
  # shellcheck disable=SC2086
  ROCKETRIDE_SERVER_DIR="$REPO" claude -p "$MSG" $RESUME_OPT \
    --output-format json \
    --permission-mode acceptEdits \
    --max-turns 250 \
    --max-budget-usd "$TURN_BUDGET" \
    --setting-sources project,local \
    --strict-mcp-config \
    --model "$MODEL" \
    --add-dir "$REPO" \
    > ".bench/result-$i.json" 2> ".bench/stderr-$i.log"
  RC=$?
  set -e
  [ -s ".bench/result-$i.json" ] && cp ".bench/result-$i.json" .bench/result.json
  if [ "$RC" -ne 0 ] || [ ! -s ".bench/result-$i.json" ]; then
    echo "[skill-bench] turn $i FAILED rc=$RC"; tail -3 ".bench/stderr-$i.log" 2>/dev/null || true
    FINAL_RC=$RC; [ "$FINAL_RC" -eq 0 ] && FINAL_RC=1; break
  fi
  read -r SESSION_ID SUBTYPE COST <<< "$(python3 -c "
import json
r = json.load(open('.bench/result-$i.json'))
print(r.get('session_id') or '-', r.get('subtype') or '-', r.get('total_cost_usd') or 0)")"
  snapshot_transcript "$SESSION_ID" "$i"
  printf '%s\t%s\t%s\t%s\n' "$i" "$SUBTYPE" "$SESSION_ID" "$COST" >> .bench/turns.tsv
  if [ "$SUBTYPE" != "success" ] || [ "$SESSION_ID" = "-" ]; then
    echo "[skill-bench] turn $i subtype=$SUBTYPE — stopping"; FINAL_RC=3; break
  fi
  if [ -n "$EXPECT" ]; then
    if ! python3 -c "
import json, re, sys
r = json.load(open('.bench/result-$i.json'))
sys.exit(0 if re.search(sys.argv[1], r.get('result') or '', re.I) else 1)" "$EXPECT"; then
      echo "[skill-bench] turn $i: expected marker /$EXPECT/ missing — early stop"; FINAL_RC=2; break
    fi
  fi
done

echo "[skill-bench] done rc=$FINAL_RC run=$RUN"
exit $FINAL_RC
