#!/usr/bin/env bash
# Video naming rule check:  <jagah>-<kya>-<device>.mp4 (lowercase, dash). Project root se:  bash tools/check-video-names.sh
cd "$(dirname "$0")/.."
bad=$(find docs/assets/videos -type f 2>/dev/null | grep -vE '/[a-z0-9]+(-[a-z0-9]+)+\.mp4$' || true)
if [ -z "$bad" ]; then echo "OK: sab video naam rule ke mutabiq hain"; else echo "In naamon mein masla hai:"; echo "$bad"; exit 1; fi
