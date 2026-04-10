#!/usr/bin/env bash
set -euo pipefail

echo "=== Setting up agent-filesystem TypeScript project ==="

# Install dependencies
pnpm install

# Compile Typescript
pnpm build

echo ""
echo "=== Setup complete ==="
echo "  pnpm build  - re-compile TypeScript"
echo "  pnpm dev    - run REPL "
