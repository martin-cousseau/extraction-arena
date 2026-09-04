#!/bin/sh
# Reinstall into the named node_modules volume when package-lock.json changes.
# Named volumes survive image rebuilds, so this is what actually picks up new deps.
set -e
if [ -f package-lock.json ]; then
  hash="$(md5sum package-lock.json | awk '{print $1}')"
  if [ ! -d node_modules/.bin ] || [ ! -f node_modules/.lockhash ] || [ "$(cat node_modules/.lockhash)" != "$hash" ]; then
    echo "[dev] package-lock changed — running npm ci"
    npm ci
    echo "$hash" > node_modules/.lockhash
  fi
fi
exec "$@"
