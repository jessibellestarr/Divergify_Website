#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
git config core.hooksPath "$ROOT/scripts/githooks"
echo "Git hooks enabled: $(git config --get core.hooksPath)"
