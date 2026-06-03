#!/bin/sh
set -e

echo "Starting SAO Blog server..."

# Extract postgres host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_PORT=${DB_PORT:-5432}

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."

# Simple TCP check using node's built-in net module
until node -e "
const net = require('net');
const s = net.createConnection(${DB_PORT}, '${DB_HOST}');
s.on('connect', () => { s.end(); process.exit(0); });
s.on('error', () => { s.destroy(); process.exit(1); });
setTimeout(() => { s.destroy(); process.exit(1); }, 2000);
" 2>/dev/null; do
  echo "Database not ready yet, retrying in 2s..."
  sleep 2
done

echo "Database is ready. Pushing schema..."

npx prisma db push --schema packages/server/prisma/schema.prisma --skip-generate 2>&1 || {
  echo "Failed to push schema to database"
  exit 1
}

echo "Schema push complete. Starting server..."

exec node packages/server/dist/index.js
