#!/bin/sh
set -e

DATA_PATH="${SPACES_DATA_PATH:-/app/data}"

mkdir -p "$DATA_PATH" 2>/dev/null || true

exec "$@"
