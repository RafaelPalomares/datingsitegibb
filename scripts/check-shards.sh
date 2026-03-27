#!/bin/bash
set -e

echo "📊 Counting Users per Neo4j Shard..."
echo "-----------------------------------"

# Node 1
echo -n "Node 1: "
docker exec muduo-neo4j-1 cypher-shell -u neo4j -p muduo_password "MATCH (u:User) RETURN count(u)" --format plain | grep -v "count(u)" || echo "0"

# Node 2
echo -n "Node 2: "
docker exec muduo-neo4j-2 cypher-shell -u neo4j -p muduo_password "MATCH (u:User) RETURN count(u)" --format plain | grep -v "count(u)" || echo "0"

# Node 3
echo -n "Node 3: "
docker exec muduo-neo4j-3 cypher-shell -u neo4j -p muduo_password "MATCH (u:User) RETURN count(u)" --format plain | grep -v "count(u)" || echo "0"

echo "-----------------------------------"
echo "Total Distributed Users (Target: 1,201+)"
