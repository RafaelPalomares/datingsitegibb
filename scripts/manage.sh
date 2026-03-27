#!/bin/bash
set -e

# Change to project root (one level up from scripts directory)
cd "$(dirname "$0")/.."

echo "--------------------------------------------------------"
echo "   Muduo App Management - Master Script 🚀"
echo "--------------------------------------------------------"

show_help() {
    echo "Usage: ./scripts/manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  prepare   - Full reset: Stop, Clean, Restart, and Seed 1201 users (Best for Demo start)"
    echo "  seed      - Quick seed: Load/Reload users without restarting containers"
    echo "  check     - Check user distribution across the 3 Neo4j shards"
    echo "  backup    - Create backups for all 3 Neo4j shards"
    echo "  restore   - Restore the latest backup from the backup/ folder"
    echo "  help      - Show this help message"
    echo ""
}

case "$1" in
    prepare)
        bash scripts/prepare-demo.sh
        ;;
    seed)
        bash scripts/seed.sh
        ;;
    check)
        bash scripts/check-shards.sh
        ;;
    backup)
        bash scripts/backup.sh
        ;;
    restore)
        bash scripts/restore-neo4j.sh backup/
        ;;
    help|*)
        show_help
        ;;
esac
