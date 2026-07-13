#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

# 빌드 타임에 NEXT_PUBLIC_BASE_PATH 같은 env가 next.config.ts에 반영되어야 한다.
# 우선순위: env.production.local > env.production > deploy/vm01/env.production
ENV_FILE=""
for f in env.production.local env.production deploy/vm01/env.production; do
  if [ -f "$f" ]; then ENV_FILE="$f"; break; fi
done

if [ -n "$ENV_FILE" ]; then
  echo "Loading env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

npm run build

mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "Standalone bundle prepared at .next/standalone"
