# Production deployment

## Server and domain

Use a maintained Linux server with Docker Engine and Compose v2. A practical starting allocation is 2 CPU cores, 2–4 GB RAM and enough SSD storage for images, PostgreSQL and backups; measure real traffic before resizing. The 3D rendering runs on visitors' devices.

Create a DNS A record for the selected hostname pointing to the server's public IPv4 address. Add an AAAA record only if IPv6 routing is configured. The registrar can be different from the hosting provider. Expose ports 80 and 443 and restrict SSH according to your operating practices. Do not publish PostgreSQL port 5432 or the Node application port in production.

The included configuration serves one hostname. If you want both the apex and `www`, choose a canonical one and add a Caddy redirect for the other after configuring DNS. Use the canonical hostname in `PUBLIC_ORIGIN`.

## First deployment

Copy the extracted source to a new release directory on the server. Keep only generated browser files in the public serving root; the included Docker image does this automatically.

```sh
npm run setup -- --domain events.example.com
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose run --rm --no-deps app node scripts/seed.mjs
docker compose exec app node scripts/admin.mjs --email administrator@example.com
```

Supply your real domain and administrator email. Seed is optional. It imports your original site content without independently verifying its awards or claims; review that content before public launch.

Caddy handles certificate issuance and renewal. Wait for the proxy to become healthy and check its logs if HTTPS is not available. The DNS records and server ports must be reachable by the certificate authority. Keep the Caddy data/config volumes across updates to preserve certificates.

PostgreSQL initialisation creates two roles: `atj_owner` for migration/maintenance ownership and a restricted `atj` login for the application. Owner credentials are not mounted into the running app. Initialisation runs only on an empty database volume.

## Settings if an existing `.env` is present

Setup preserves existing files. Edit these fields manually before using a public domain:

```dotenv
PUBLIC_ORIGIN=https://events.example.com
SITE_ADDRESS=events.example.com
HTTP_PORT=80
HTTPS_PORT=443
ALLOW_INSECURE_LOCAL=0
```

Then recreate the app and proxy. `PUBLIC_ORIGIN` has no trailing path. If you add another proxy such as a CDN, review the trusted proxy configuration, original client IP handling and HTTPS mode rather than blindly stacking forwarders.

## Staging acceptance

Use a separate HTTPS staging hostname, project directory, secrets, Docker project and volumes. Prefer a separate server; if sharing one, use your existing front proxy and avoid conflicting 80/443 bindings.

1. Confirm `/health/ready` returns 200.
2. Sign in; create and preview a new stall.
3. Save edits to an already published stall and confirm the public copy remains unchanged.
4. Publish, verify the public change, then restore or remove the test content.
5. Submit a test enquiry and verify it in the inbox.
6. Verify image upload, draft image privacy and CSV export.
7. Test desktop Chrome, Android Chrome and iPhone Safari, including touch controls, fallback, arcade and landscape.
8. Run and restore a backup in an isolated environment.
9. Review the privacy notice, operational retention schedule and original portfolio content.

The automated browser suite is useful but does not establish real-device frame rate or battery behaviour.

## Updates

Back up first. Use the same Compose project name and volumes to retain content. New migrations must be added as new numbered SQL files; never modify an applied migration.

```sh
bash scripts/backup.sh
docker compose build --pull
docker compose run --rm migrate
docker compose up -d --force-recreate app proxy
docker compose ps
```

For a migration that changes compatibility with the currently running app, stop the app during the migration and plan a maintenance window. The migration runner uses a transaction and database advisory lock, and verifies checksums of already applied migrations.

Record the release commit/archive checksum and image digest. The supplied image tags track maintained major releases; a controlled release process should pin tested image digests and update them deliberately.

## Rollback

Keep the previous source/image and a verified pre-update database plus uploads backup. Redeploy the old image only if it is compatible with the new schema. Otherwise restore the pre-update database and image backup, which discards writes made since that backup. There are no automatic destructive down-migrations.

## Operator references

- [Docker Compose startup dependencies](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Caddy HTTPS requirements](https://caddyserver.com/docs/quick-starts/https)
- [PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
