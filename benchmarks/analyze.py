#!/usr/bin/env python3
"""Skill-Bench analyzer: transcript-first scoring of one run.

Usage: analyze.py /tmp/skill-bench/runs/<id>-<seed>
Writes <run>/.bench/scorecard.json and prints a markdown summary.
"""
import glob
import json
import os
import re
import sys


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def load_jsonl(path):
    out = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return out


def main(run_dir):
    bench = os.path.join(run_dir, ".bench")
    result = json.load(open(os.path.join(bench, "result.json")))
    scenario = json.load(open(os.path.join(bench, "scenario.json")))
    gt = scenario.get("ground_truth", {})

    session_id = result.get("session_id", "")
    final_text = result.get("result") or ""

    # ---- locate + parse transcript (authoritative tool-call log) ----
    pats = glob.glob(os.path.expanduser(f"~/.claude/projects/*/{session_id}.jsonl"))
    transcript = load_jsonl(pats[0]) if pats else []
    tool_calls = []        # (name, input-as-string)
    assistant_texts = []
    for entry in transcript:
        msg = entry.get("message") or {}
        if entry.get("type") == "assistant":
            for blk in msg.get("content") or []:
                if isinstance(blk, dict):
                    if blk.get("type") == "tool_use":
                        tool_calls.append((blk.get("name", ""), json.dumps(blk.get("input", {}), default=str)))
                    elif blk.get("type") == "text":
                        assistant_texts.append(blk.get("text", ""))
    if not final_text and assistant_texts:
        final_text = assistant_texts[-1]
    # The gate presentation often spans several trailing messages (brief, dismissed question
    # fallback, summary) — score against what the user actually sees at the gate: the last 3
    # assistant texts plus any AskUserQuestion option text.
    question_text = " ".join(
        inp for name, inp in tool_calls if name == "AskUserQuestion"
    )
    gate_text = "\n".join(assistant_texts[-3:] + [final_text, question_text])
    nf = norm(gate_text)

    bash_cmds = []
    for name, inp in tool_calls:
        if name == "Bash":
            try:
                bash_cmds.append(json.loads(inp).get("command", ""))
            except json.JSONDecodeError:
                bash_cmds.append(inp)

    # ---- metrics ----
    ops_found, ops_missing = {}, []
    for op, aliases in (gt.get("required_ops") or {}).items():
        hit = any(norm(a) in nf for a in aliases)
        ops_found[op] = hit
        if not hit:
            ops_missing.append(op)
    bonus_found = {
        op: any(norm(a) in nf for a in aliases)
        for op, aliases in (gt.get("bonus_ops") or {}).items()
    }

    gate_a_stop = "gate a" in gate_text.lower()
    partition_language = any(
        w in gate_text.lower()
        for w in ["deferred", "out of scope", "out-of-scope", "not in the mvp",
                  "later phase", "excluded", "alternatives", "not be", "won't"]
    )
    exists_check = any(
        ("ls-tree" in c) or ("gh pr list" in c) or ("services" in c and "grep" in c)
        for c in bash_cmds
    )
    skill_files_read = sorted({
        m.group(0)
        for _, inp in tool_calls
        for m in re.finditer(
            r"[\w\-/\.]*(?:rocketride-node-skills/skills|\.claude/skills)/rocketride-[\w\-/\.]+",
            inp,
        )
    })
    skills_invoked = sorted({
        json.loads(inp).get("skill", "?")
        for name, inp in tool_calls if name == "Skill"
    }) if any(n == "Skill" for n, _ in tool_calls) else []
    writes = [
        (name, (json.loads(inp).get("file_path") or "")[:120])
        for name, inp in tool_calls
        if name in ("Write", "Edit", "NotebookEdit")
    ]
    mutation_attempts = [
        c for c in bash_cmds
        if re.search(r"git\s+(-C\s+\S+\s+)?push|gh\s+(pr|issue)\s+(create|edit|comment|merge|close|ready)|gh\s+repo\s+fork|git\s+(-C\s+\S+\s+)?commit", c)
    ]

    scorecard = {
        "run": os.path.basename(run_dir.rstrip("/")),
        "scenario": scenario.get("id"),
        "session_id": session_id,
        "subtype": result.get("subtype"),
        "num_turns": result.get("num_turns"),
        "cost_usd": result.get("total_cost_usd"),
        "duration_s": round((result.get("duration_ms") or 0) / 1000),
        "transcript_found": bool(pats),
        "tool_call_count": len(tool_calls),
        "ops_found": ops_found,
        "ops_missing": ops_missing,
        "ops_score": f"{sum(ops_found.values())}/{len(ops_found)}" if ops_found else "n/a",
        "bonus_found": bonus_found,
        "gate_a_stop": gate_a_stop,
        "partition_language": partition_language,
        "exists_check_ran": exists_check,
        "skills_invoked": skills_invoked,
        "skill_files_read": skill_files_read,
        "writes": writes,
        "mutation_attempts": mutation_attempts,
    }
    with open(os.path.join(bench, "scorecard.json"), "w") as f:
        json.dump(scorecard, f, indent=2)

    # ---- markdown summary ----
    print(f"## {scorecard['run']}")
    print(f"- session `{session_id}` | {scorecard['subtype']} | turns {scorecard['num_turns']} "
          f"| ${scorecard['cost_usd']} | {scorecard['duration_s']}s | tools {len(tool_calls)}")
    print(f"- ops: **{scorecard['ops_score']}** missing={ops_missing or 'none'} bonus={[k for k, v in bonus_found.items() if v]}")
    print(f"- gate_a_stop={gate_a_stop} partition={partition_language} exists_check={exists_check}")
    print(f"- skills invoked: {skills_invoked}")
    print(f"- skill files read: {len(skill_files_read)}")
    print(f"- writes: {len(writes)} | mutation attempts: {mutation_attempts or 'NONE'}")
    return scorecard


if __name__ == "__main__":
    main(sys.argv[1])
