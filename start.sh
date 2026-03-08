#!/bin/sh
set -e

echo "🔧 Running database migrations..."
bun run drizzle-kit push --force

echo "🌱 Seeding database..."
bun run src/db/seed.ts

echo "🚀 Starting application..."
exec bun run src/index.ts
