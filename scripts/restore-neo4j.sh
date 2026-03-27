#!/bin/bash
set -e

if [ "$#" -lt 1 ]; then
  echo "Usage: bash scripts/restore-neo4j.sh <backup-directory>"
  exit 1
fi

BACKUP_DIR="${1%/}"
cd "$(dirname "$0")/.."

# Check if backup files exist
for i in 1 2 3; do
  DUMP_FILE="$BACKUP_DIR/muduo-neo4j-$i.dump"
  if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Error: Missing dump file $DUMP_FILE"
    exit 1
  fi
done

echo "🛑 Stopping Neo4j nodes for restore..."
docker-compose stop neo4j-node-1 neo4j-node-2 neo4j-node-3

echo "🔄 Restoring Shards..."

for i in 1 2 3; do
  echo "Node $i..."
  # We use a temporary container to load the dump into the volume
  docker run --rm \
    -v "contextmatch_neo4j_data_$i:/data" \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    neo4j:5.25.1-community \
    bash -c "cp /backup/muduo-neo4j-$i.dump /tmp/neo4j.dump && neo4j-admin database load neo4j --from-path=/tmp --overwrite-destination=true"
done

echo "🚀 Restarting Neo4j nodes..."
docker-compose start neo4j-node-1 neo4j-node-2 neo4j-node-3

echo "✅ Restore completed successfully from $BACKUP_DIR"
