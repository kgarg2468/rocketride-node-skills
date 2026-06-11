#!/usr/bin/env bash
# Sync a node from a rocketride-server checkout into the local engine bundle so the
# IDE's Local engine can load it. Usage:
#   sync-node-to-engine.sh <repo-path> <node_name>
set -euo pipefail

REPO="${1:?usage: sync-node-to-engine.sh <repo-path> <node_name>}"
NODE="${2:?usage: sync-node-to-engine.sh <repo-path> <node_name>}"

SRC="$REPO/nodes/src/nodes/$NODE"
DST="$HOME/Library/Application Support/RocketRide/engine/nodes/$NODE"

[ -d "$SRC" ] || { echo "Node dir not found: $SRC" >&2; exit 1; }
[ -d "$(dirname "$DST")" ] || { echo "Engine bundle not found at $(dirname "$DST") — is the RocketRide IDE installed?" >&2; exit 1; }

rm -rf "$DST"
cp -R "$SRC" "$DST"
rm -rf "$DST/__pycache__"

echo "Synced $NODE -> $DST"
echo "Now FULLY restart the engine: in the IDE run 'Developer: Reload Window'."
echo "(Reconnect is NOT enough — the engine only scans nodes at process startup.)"
