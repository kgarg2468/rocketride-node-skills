#!/usr/bin/env python3
"""Skill-Bench aggregator: analyze every run dir, emit one markdown matrix + totals.

Usage: aggregate.py [runs_root]   (default /tmp/skill-bench/runs)
"""
import glob
import io
import json
import os
import sys
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze  # noqa: E402


def main(root):
    rows, failed = [], []
    for run_dir in sorted(glob.glob(os.path.join(root, "*/"))):
        if not os.path.exists(os.path.join(run_dir, ".bench", "result.json")):
            continue
        if os.path.basename(run_dir.rstrip("/")).startswith("smoke"):
            continue
        try:
            with redirect_stdout(io.StringIO()):
                sc = analyze.main(run_dir)
            rows.append(sc)
        except Exception as e:  # noqa: BLE001
            failed.append((run_dir, str(e)))

    rows.sort(key=lambda r: (r["scenario"] or "", r["arm"], r["run"]))
    valid = [r for r in rows if not r.get("infra_invalid")]
    invalid = [r for r in rows if r.get("infra_invalid")]
    print("| run | arm | ops | gate stop | partition | exists✓ | writes | mutations | cost | turns |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    total = 0.0
    for r in rows:
        total += r["cost_usd"] or 0
        if r.get("infra_invalid"):
            continue
        flag = " ⚠️" if r.get("red_valid") is False else ""
        print(f"| {r['run']}{flag} | {r['arm']} | {r['ops_score']} | "
              f"{'✅' if r['gate_a_stop'] else '❌'} | {'✅' if r['partition_language'] else '—'} | "
              f"{'✅' if r['exists_check_ran'] else '❌'} | {len(r['writes'])} | "
              f"{len(r['mutation_attempts'])} | ${r['cost_usd']} | {r['num_turns']} |")
    gtier = [r for r in valid if r["arm"] == "green"]
    blast = [r for r in gtier if r["writes"] or r["mutation_attempts"]]
    print(f"\n**Valid runs: {len(valid)} | infra-invalid (excluded): {len(invalid)} "
          f"| total spend: ${round(total, 2)}**")
    print(f"**GREEN runs with stray writes/mutations (blast-through): {len(blast)} / {len(gtier)}**")
    if blast:
        for r in blast:
            print(f"  - {r['run']}: W={len(r['writes'])} M={len(r['mutation_attempts'])}")
    if failed:
        print("\nAnalyze failures:")
        for d, e in failed:
            print(f"- {d}: {e}")

    # ops-missing detail for anything below full score
    print("\n### Misses")
    any_miss = False
    for r in rows:
        if r["ops_missing"]:
            any_miss = True
            print(f"- {r['run']} [{r['arm']}]: missing {r['ops_missing']}")
    if not any_miss:
        print("- none")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/skill-bench/runs")
