# Operations

## Health and logs

- `/health/live`: process is responsive.
- `/health/ready`: PostgreSQL and migration metadata are accessible.
- Docker health checks use readiness. The proxy starts after the app is healthy.
- `docker compose logs --tail 100 app` and `... proxy` provide structured logs.
- Docker JSON logs rotate at 10 MB × 3 files per service.

Monitor availability, disk space, PostgreSQL storage, upload storage, error rates and backup age. Readiness is a minimal check, not a complete user-journey test. A healthy process can still have content/layout problems.

## Backups

From the project directory in Bash:

```sh
bash scripts/backup.sh
```

This briefly stops the app to prevent content/image writes, takes a PostgreSQL custom-format dump and an uploads archive, writes SHA-256 checksums, and restarts the app even if backup fails. The proxy may return temporary errors during the pause. Files are created with restrictive host permissions. Store a copy on another machine or protected object storage; backups kept only on the same disk are not sufficient.

The database dump includes administrator password hashes, sessions and personal enquiries. Protect and encrypt backups at rest. Keep current configuration/secrets separately in your server's secret management process; they are intentionally excluded from the backup archive. Record the PostgreSQL major version and application release alongside each backup.

A suggested starting policy is daily backups, seven daily copies and four weekly copies. Adjust to your business recovery and privacy requirements, and prune obsolete off-server copies. This is an operational policy, not something the app schedules automatically.

## Restore drill

Use an isolated test installation first. Create the containers and database roles with `docker compose up -d db`. Restore into the matching PostgreSQL major version, then migrate forward if appropriate:

```sh
bash scripts/restore.sh /absolute/path/to/backup --confirm-replace
```

The command verifies checksums, stops the app, replaces database contents, extracts uploads, runs migrations and starts the app. It intentionally leaves the app stopped if restore fails. An empty image volume is preferred for a clean restoration; old unreferenced files in an existing volume are not served by the API.

The script creates the app/proxy containers if this is a fresh installation. Verify sign-in, public images, a stall publish and an enquiry. Existing sessions in the backup may become valid again until expiry: revoke them after restoring sensitive backups using the SQL below.

## Scheduled maintenance

Run daily, using your host's scheduler, from the deployment directory:

```sh
docker compose run --rm --no-deps app node scripts/maintenance.mjs
```

It removes expired sessions, login attempt records older than a day, audit events older than 365 days, and enquiries older than `ENQUIRY_RETENTION_DAYS`. It does not delete images or backups. The privacy page reflects the configured enquiry retention value; actually schedule the command so that statement matches operations.

Example Linux cron entry (replace the path and choose a suitable local time):

```cron
15 3 * * * cd /srv/atj-studio && /usr/bin/docker compose run --rm --no-deps app node scripts/maintenance.mjs >> /var/log/atj-maintenance.log 2>&1
```

Rotate that host maintenance log separately. Install a backup schedule using `scripts/backup.sh` and your off-server transfer process. Avoid running backup and restore/maintenance simultaneously.

## Administrators

```sh
docker compose exec app node scripts/admin.mjs --email new.admin@example.com
docker compose exec app node scripts/admin.mjs --email admin@example.com --reset-password
```

Passwords are entered through a hidden prompt. Reset invalidates all sessions for that administrator. Use `--password-file /private/path` only when automation requires it; never put a password into shell arguments or commit the file. Inside Docker that path must exist inside the container.

To revoke all sessions using the database owner's local socket:

```sh
docker compose exec db psql -U atj_owner -d atj -c 'DELETE FROM sessions;'
```

All studio administrators have full editorial and enquiry access. There is no separate viewer role or MFA integration in this version. Give accounts only to the team members who need that access.

## Database password rotation

Changing a secret file alone does not update an existing PostgreSQL password. Use an interactive owner connection:

```sh
docker compose exec db psql -U atj_owner -d atj
```

Run `\password atj` to change the application role password without storing it in SQL history. Update `.secrets/db_password` to that same password, retaining the existing file permissions, and recreate the app/migration services. For the owner, use `\password atj_owner`, update `.secrets/db_owner_password`, and recreate the database/migration containers. Keep the PostgreSQL volume. Test readiness and admin access afterward; plan a short maintenance window.

## Capacity

The default is one app instance with PostgreSQL pooling of 10 connections. Image uploads are limited to 8 MB each and 25 million pixels. The studio image chooser lists the 200 newest assets; CSV exports cap at 10,000 newest enquiries. Larger deployments need measured pagination/storage/export requirements, shared storage, and shared general rate limiting before multiple app replicas are enabled.
