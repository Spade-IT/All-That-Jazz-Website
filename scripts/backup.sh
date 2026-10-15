#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_dir="${1:-backups/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$backup_dir"
if [ -e "$backup_dir/database.dump" ]; then echo 'Choose a new, empty backup directory.' >&2; exit 1; fi
restart_app() { docker compose start app >/dev/null; }
trap restart_app EXIT
docker compose stop app >/dev/null
docker compose exec -T db pg_dump -U atj_owner -d atj -Fc > "$backup_dir/database.dump"
docker compose run --rm --no-deps -T app tar -C /app/var/uploads -czf - . > "$backup_dir/uploads.tar.gz"
(cd "$backup_dir" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
echo "Backup complete: $backup_dir. Copy it to protected off-server storage."
