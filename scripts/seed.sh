#!/bin/bash
set -e

echo "Starting seed process..."

cd "$(dirname "$0")/../backend"

# Install dependencies if they are missing
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

echo "Running seed script..."
set -a
source ../.env
set +a
NEO4J_URIS="bolt://localhost:7687,bolt://localhost:7688,bolt://localhost:7689" npx ts-node-dev --transpile-only ../seed.ts

echo "Seed process complete."
