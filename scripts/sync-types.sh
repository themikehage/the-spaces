#!/usr/bin/env bash
set -e

# Export shared schemas to Dart models in apps/mobile/lib/core/models/
bun run scripts/export-shared-schema.ts

echo "Type synchronization completed."
