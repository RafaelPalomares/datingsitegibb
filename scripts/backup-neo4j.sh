#!/usr/bin/env sh

set -eu

BACKUP_ROOT="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="${BACKUP_ROOT}/muduo-shards-${TIMESTAMP}"
CONTAINERS="${NEO4J_CONTAINERS:-muduo-neo4j-1 muduo-neo4j-2 muduo-neo4j-3}"
DB_USER="${NEO4J_USER:-neo4j}"
DB_PASSWORD="${NEO4J_PASSWORD:-muduo_password}"

mkdir -p "${TARGET_DIR}"

for CONTAINER_NAME in ${CONTAINERS}; do
  printf 'Creating backup for %s...\n' "${CONTAINER_NAME}"
  docker exec "${CONTAINER_NAME}" cypher-shell -u "${DB_USER}" -p "${DB_PASSWORD}" "RETURN 1;"
  docker exec "${CONTAINER_NAME}" sh -c 'rm -f /tmp/muduo-backup.dump && neo4j-admin database dump neo4j --to-path=/tmp'
  docker cp "${CONTAINER_NAME}:/tmp/muduo-backup.dump" "${TARGET_DIR}/${CONTAINER_NAME}.dump"
  docker exec "${CONTAINER_NAME}" sh -c 'rm -f /tmp/muduo-backup.dump'
done

printf 'Shard backups created in: %s\n' "${TARGET_DIR}"
