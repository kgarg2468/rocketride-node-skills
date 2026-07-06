# Live-engine and IDE-canvas testing

The most realistic layer — the node running inside a real engine, on the canvas. Needs the user
in the loop.

## Preferred local prototype path

When the installed engine supports it, use workspace-local nodes instead of copying into the
downloaded bundle:

1. Develop the node under a repo-local `local_nodes/<node_name>/` package.
2. In the service file, set `path` to `local_nodes.<node_name>`.
3. Start the engine with `--node_path=/path/to/dir-containing-local_nodes`.
4. Restart the engine after manifest/code changes so it rescans.
5. When ready to ship, move the package to `nodes/src/nodes/<node_name>/` and change `path` to
   `nodes.<node_name>`.

This is the cleanest prototype loop from the `--node_path` / `local_nodes` support. Use the
bundle-copy path below only when the user's engine cannot be launched with `--node_path` or when
you are validating the packaged installed-app behavior.

## How the bundled engine finds nodes (the trap)

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
- **Config set on the canvas (API keys included) may not reach already-running node code** — a
  key pasted into the node's panel after the engine spawned can leave the running parser
  effectively unconfigured. Symptom: the node behaves as if no key is set even though the panel
  shows one. After any config change on a freshly-synced node: Reload Window, then re-run,
  before debugging the node itself.
- **Icons are cached harder than code**: a hot-synced new/fixed SVG won't visibly update on
  Reload Window — only a **full IDE quit + relaunch** clears it. Don't claim the icon renders
  until someone has actually seen it render.

(Some setups run the engine from the repo via `./builder nodes:build` — then sync is just the
build. Check which engine the user's IDE actually spawned before assuming.)

## Canvas smoke test (with the user)

1. Sync + Reload Window; Add Node → search for the node — it should appear **with its real
   icon**. A generic chain-link means the SVG was rejected (usually missing `width`/`height` —
   see building-nodes gotchas.md).
2. Wire a minimal pipe (e.g. Chat → node → Response), fill config (use `${VARS}` from the
   Variables panel for keys), press ▶. If config was edited after the engine spawned, Reload
   Window first (see the trap list above).
3. First run auto-installs the node's `requirements.txt` into the engine's Python env via
   `depends()` — one-time.
4. Check the Trace tab for the node's calls — then **open the actual output** (the Result row /
   Response node payload). Green lifecycle rows + an empty payload is a FAIL, not a pass.
   **Latency is the tell:** a remote-API node finishing in under ~1 s on a multi-MB input means
   the API was never called (stale engine, key not propagated) — Reload Window and re-run.
5. "Failed to start" with uvicorn `sys.exit(1)` is usually a **port conflict** from stray engine
   processes, not the node — retry, then Reload Window.

## Debugging a live run

- **Temporary diagnostics beat screenshot ping-pong.** When a canvas run misbehaves, add
  `/tmp`-file logging to the node (bytes assembled? key present? vendor called? error body?),
  sync, have the user reload + re-run once, then read the log yourself. One round-trip instead
  of many. **Strip the diagnostics before commit** and say you did — the shipped diff must be
  diagnostic-free.
- **Never echo the user's API key back into chat** — refer to it indirectly ("the key you set").
  Keys live in env vars, `${VARS}`, or gitignored `.context/` files; advise rotation if one was
  pasted into the conversation.

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
