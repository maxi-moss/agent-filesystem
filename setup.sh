#!/usr/bin/env bash
set -euo pipefail

echo "=== Setting up agent-filesystem TypeScript project ==="

# Install dependencies
pnpm install

echo ""
echo "=== Setup complete ==="
echo "  pnpm run build  - compile TypeScript"
echo "  pnpm run dev    - run with ts-node"
