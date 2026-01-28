#!/bin/sh
set -e

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "Starting application..."
exec node server.js
