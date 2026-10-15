#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 2 ] || [ "$2" != '--confirm-replace' ]; then echo 'Usage: scripts/restore.sh BACKUP_DIR --confirm-replace' >&2; exit 1; fi
backup_dir="$1"
(cd "$backup_dir" && sha256sum -c SHA256SUMS)
docker compose stop app
# Keep the app stopped if restore fails; investigate before restarting it.
docker compose exec -T db pg_restore -U atj_owner -d atj --clean --if-exists --exit-on-error < "$backup_dir/database.dump"
docker compose run --rm --no-deps -T app tar -C /app/var/uploads -xzf - < "$backup_dir/uploads.tar.gz"
docker compose run --rm --no-deps migrate
docker compose up -d app proxy
echo 'Restore complete. Check /health/ready and the website before reopening access.'
