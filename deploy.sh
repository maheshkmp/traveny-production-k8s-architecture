#!/bin/bash
set -e

IMAGE_TAG="${1:-latest}"

echo "🚀 Deploying Traveny (tag: ${IMAGE_TAG})..."
cd ~/projects/traveny

git fetch origin main
git reset --hard origin/main

echo "📦 Pulling images from GHCR..."
echo "${GHCR_TOKEN}" | docker login ghcr.io -u maheshkmp --password-stdin 2>/dev/null || true
export IMAGE_TAG
docker compose pull api web

echo "🗄️ Ensuring database is up..."
docker compose up -d db
docker compose exec -T db sh -c 'until pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}; do sleep 2; done'

echo "⏳ Running database migrations..."
source .env
docker run --rm \
  --network traveny_default \
  -e DATABASE_URL="${DATABASE_URL}" \
  -v "$(pwd)":/app \
  -w /app \
  oven/bun:1 \
  sh -c "bun install --frozen-lockfile && cd packages/core && bun run db:migrate"

echo "🔄 Starting services with new images..."
docker compose up -d --remove-orphans

echo "🧹 Cleaning old images..."
docker image prune -f

echo "📌 Deployed tag: ${IMAGE_TAG}"
echo "📌 Latest commit:"
git log --oneline -1
echo "✅ Done at $(date)"