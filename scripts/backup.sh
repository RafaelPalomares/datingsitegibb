#!/bin/bash
set -e

# Change to project root (one level up from scripts directory)
cd "$(dirname "$0")/.."

BACKUP_DIR="backup"
mkdir -p "$BACKUP_DIR"

echo "Stopping Neo4j containers to ensure consistent backup..."
docker-compose stop neo4j-node-1 neo4j-node-2 neo4j-node-3

echo "Starting backup of neo4j-node-1..."
docker run --rm -v contextmatch_neo4j_data_1:/data -v "$(pwd)/$BACKUP_DIR:/backup" neo4j:5.25.1-community bash -c "neo4j-admin database dump neo4j --to-path=/backup && mv /backup/neo4j.dump /backup/muduo-neo4j-1.dump"

echo "Starting backup of neo4j-node-2..."
docker run --rm -v contextmatch_neo4j_data_2:/data -v "$(pwd)/$BACKUP_DIR:/backup" neo4j:5.25.1-community bash -c "neo4j-admin database dump neo4j --to-path=/backup && mv /backup/neo4j.dump /backup/muduo-neo4j-2.dump"

echo "Starting backup of neo4j-node-3..."
docker run --rm -v contextmatch_neo4j_data_3:/data -v "$(pwd)/$BACKUP_DIR:/backup" neo4j:5.25.1-community bash -c "neo4j-admin database dump neo4j --to-path=/backup && mv /backup/neo4j.dump /backup/muduo-neo4j-3.dump"

echo "Restarting Neo4j nodes..."
docker-compose start neo4j-node-1 neo4j-node-2 neo4j-node-3

echo "Backup complete! Dump files are located in $BACKUP_DIR."
