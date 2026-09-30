#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Instala Node.js LTS 22 o 24 desde https://nodejs.org/'; exit 1; }
npm ci --no-audit --no-fund
npx playwright install --with-deps chromium firefox webkit
npm run validate
npm test -- "$@"
