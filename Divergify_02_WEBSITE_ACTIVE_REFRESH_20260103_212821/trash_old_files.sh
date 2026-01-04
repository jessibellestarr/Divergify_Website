#!/usr/bin/env bash
set -e

# This script moves old site files into Trash (Linux with gio), leaving ONLY 02_WEBSITE_ACTIVE.
# Run from the repo root.

if ! command -v gio >/dev/null 2>&1; then
  echo "gio not found. Install a trash utility or move files manually."
  exit 1
fi

KEEP="02_WEBSITE_ACTIVE"
for item in * .*; do
  [ "$item" = "." ] && continue
  [ "$item" = ".." ] && continue
  [ "$item" = "$KEEP" ] && continue
  [ "$item" = ".git" ] && continue
  gio trash "$item" 2>/dev/null || true
done

echo "Moved everything except $KEEP and .git to Trash."
