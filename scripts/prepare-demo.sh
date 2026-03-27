#!/bin/bash
set -e

# Change to project root
cd "$(dirname "$0")/.."

echo "🚀 Preparing Muduo Live Demo..."

# 1. Stop and Clean (Optional but recommended for a clean state)
echo "🧹 Cleaning up existing containers..."
docker-compose down -v

# 2. Start Infrastructure
echo "📡 Starting Neo4j Cluster and Services..."
docker-compose up -d --build

# 3. Wait for Neo4j to be healthy
echo "⏳ Waiting for Neo4j nodes to be healthy (this may take a minute)..."
# Simple wait loop
until docker exec muduo-neo4j-1 cypher-shell -u neo4j -p muduo_password "RETURN 1" > /dev/null 2>&1; do
  printf "."
  sleep 2
done
echo " Match!"

# 4. Seed Data
echo "🌱 Seeding 1,200+ users and diverse context..."
bash scripts/seed.sh

echo "✅ Demo is ready!"
echo "Frontend: http://localhost:3010"
echo "Backend:  http://localhost:4000"
echo "Admin:    http://localhost:3010/admin"
echo "Demo User: demo.user001@muduo.local / muduo-demo-password"
echo "Admin User: admin@muduo.local / muduo-admin-password"
