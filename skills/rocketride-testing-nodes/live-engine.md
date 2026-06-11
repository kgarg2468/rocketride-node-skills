# Live-engine and IDE-canvas testing

The most realistic layer — the node running inside a real engine, on the canvas. Needs the user
in the loop.

## How the engine finds nodes (the trap)

The IDE's Local engine typically runs from the **downloaded bundle** at
`~/Library/Application Support/RocketRide/engine/` and loads **its own bundled `nodes/`**, not
your repo checkout. And it scans nodes **only at process startup**.

Consequences:
- Editing the repo and clicking "Reconnect" does nothing — Reconnect re-attaches to the same
  running engine process.
- To surface a new/changed node: **copy it into the bundle** (use `sync-node-to-engine.sh`),
  then fully restart the engine — **Developer: Reload Window** in the IDE (the engine runs with
  `--autoterm`, so it dies with the window and respawns, re-scanning).
- If the node still doesn't appear, check the cached catalog:
  `grep <node_name> .rocketride/services-catalog.json` in the project — present means the canvas
  has it; absent after a true restart means the engine rejected the manifest.
- The bundle copy goes stale on every code change — re-run the sync script each iteration.

(Some setups run the engine from the repo via `./builder nodes:build` — then sync is just the
build. Check which engine the user's IDE actually spawned before assuming.)

## Canvas smoke test (with the user)

1. Sync + Reload Window; Add Node → search for the node — it should appear with its icon.
2. Wire a minimal pipe (e.g. Chat → node → Response), fill config (use `${VARS}` from the
   Variables panel for keys), press ▶.
3. First run auto-installs the node's `requirements.txt` into the engine's Python env via
   `depends()` — one-time.
4. Check the Trace tab for the node's calls.
5. "Failed to start" with uvicorn `sys.exit(1)` is usually a **port conflict** from stray engine
   processes, not the node — retry, then Reload Window.

## Live vendor harness (`.context/`, gitignored)

For nodes wrapping a runnable service, write a one-command harness in the workspace's
`.context/` dir (never shipped in the PR):

```
.context/<vendor>-test/
├── run.sh          # launch throwaway service → create creds → seed fixtures → run checks → teardown
│                   #   --keep flag: leave it running + write credentials.txt for IDE testing
├── live_verify.py  # drives the node's REAL code (real requests) against the live service
└── README.md
```

Model: the n8n harness (npx-launched n8n, seeded workflows, 15 live checks, clean teardown).
Always do the **final** harness run from a fresh seed, not a warm environment — fresh-seed runs
caught 2 real bugs the warm runs missed.
