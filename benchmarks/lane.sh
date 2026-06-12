#!/usr/bin/env bash
# Skill-Bench lane runner: executes a manifest of runs SEQUENTIALLY, never stops on failure.
# Usage: lane.sh <lane-name> <manifest-file>
# Manifest line format (whitespace-separated):
#   <scenario-basename.json> <seed> [red] [model=<model-id>]
set -uo pipefail

LANE="$1"
MANIFEST="$2"
BENCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEDGER=/tmp/skill-bench/ledger.tsv
RR=/tmp/skill-bench/rocketride-server
RR_HOME_BRANCH="$(git -C "$RR" branch --show-current)"

# Cross-run contamination guard: blast-through runs can leave worktrees, branches, and
# stray files in the SHARED bench clone (observed: a later run amended an earlier run's
# worktree commit). Scrub after every run.
scrub_clone() {
  git -C "$RR" worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}' | tail -n +2 | while read -r wt; do
    git -C "$RR" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  done
  git -C "$RR" worktree prune 2>/dev/null || true
  git -C "$RR" checkout -f "$RR_HOME_BRANCH" 2>/dev/null || true
  git -C "$RR" clean -fdq 2>/dev/null || true
  git -C "$RR" for-each-ref --format='%(refname:short)' refs/heads | while read -r br; do
    [ "$br" = "$RR_HOME_BRANCH" ] || git -C "$RR" branch -D "$br" 2>/dev/null || true
  done
  rm -rf /tmp/skill-bench/*-wt 2>/dev/null || true
}

while read -r SCEN SEED ARG3 ARG4; do
  [ -z "${SCEN:-}" ] && continue
  case "$SCEN" in \#*) continue;; esac
  ARM_FLAG=""; MODEL_ENV=""
  for a in "${ARG3:-}" "${ARG4:-}"; do
    case "$a" in
      red) ARM_FLAG="--null-baseline";;
      model=*) MODEL_ENV="${a#model=}";;
    esac
  done
  START=$(date +%s)
  if [ -n "$MODEL_ENV" ]; then
    SKILL_BENCH_MODEL="$MODEL_ENV" "$BENCH_SRC/driver.sh" "$BENCH_SRC/scenarios/$SCEN" "$SEED" $ARM_FLAG
  else
    "$BENCH_SRC/driver.sh" "$BENCH_SRC/scenarios/$SCEN" "$SEED" $ARM_FLAG
  fi
  RC=$?
  DUR=$(( $(date +%s) - START ))
  scrub_clone
  printf '%s\t%s\t%s\t%s\t%s\t%ss\n' "$LANE" "$SCEN" "$SEED" "${ARM_FLAG:-green}${MODEL_ENV:+ $MODEL_ENV}" "rc=$RC" "$DUR" >> "$LEDGER"
  echo "[lane:$LANE] $SCEN $SEED rc=$RC ${DUR}s"
done < "$MANIFEST"
echo "[lane:$LANE] COMPLETE"
