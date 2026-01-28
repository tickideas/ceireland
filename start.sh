#!/bin/sh
set -e

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting application..."
exec node server.js
