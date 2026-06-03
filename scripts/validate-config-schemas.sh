#!/usr/bin/env bash
# Validates all YAML config files against their JSON schemas, then runs cross-file reference checks.
set -e

SCHEMA_DIR="src/config/schemas"
CONFIG_DIR="src/config"

configs=(
    "tests"
    "measurement_groups"
    "calculations"
    "thresholds"
    "measurements"
    "interpretations"
)

for name in "${configs[@]}"; do
    npx ajv validate \
        -s "$SCHEMA_DIR/${name}.schema.json" \
        -d "$CONFIG_DIR/${name}.yaml" \
        --spec=draft2020
done

node scripts/validate-config-refs.js
