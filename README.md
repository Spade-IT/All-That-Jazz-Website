# All That Jazz — Experience Studio

A self-hosted 3D portfolio and stall CMS built from your original V3 website. Node.js / Fastify serves the public site, a dedicated admin studio, and an API. PostgreSQL stores content, published snapshots, administrators, sessions and enquiries. Images live in a persistent upload volume. Caddy handles the reverse proxy and HTTPS.

## What is included

- Your original navigable 3D venue, wall cutaways, audio, Tetris and Space War.
- Five reusable 3D designs that can occupy any of the five venue positions.
- Unlimited saved drafts; up to **five simultaneously published stalls**, one per position.
- A responsive `/admin/` studio: create, duplicate, edit, save, preview, publish, unpublish and delete stalls.
- Editable copy, accent colour, position, template, cover image, logo and project source link.
- Separate draft/published snapshots: saving an edit does not alter the live website.
- Protected image uploads, admin sessions, enquiry inbox, status tracking, CSV export and audit history.
- Docker production stack, database migrations, setup utility, backup/restore scripts, development workflow, automated tests and CI.

This version is a **template-based 3D CMS**. It does not import arbitrary GLB/FBX files or offer free dragging of geometry. Uploaded covers appear in project cards/stories; logos appear beside venue labels. Photographs are not applied as 3D surface textures. Adding new designs or more floor positions requires renderer/layout development. Automatic email notifications are not configured: submitted enquiries are saved in the studio inbox, where “Reply by email” opens your email application.

## Start here: test it locally as a production application

Install **Docker Engine/Desktop with Compose v2** and **Node.js 24 LTS**. On Windows use Docker Desktop with Linux containers; the commands below work in PowerShell, macOS Terminal or Linux. Bash is needed only for the backup/restore scripts.

From the extracted project directory:

```sh
npm run setup
docker compose up -d --build
docker compose run --rm --no-deps app node scripts/seed.mjs
docker compose exec app node scripts/admin.mjs --email your.name@yourcompany.com
```

The last command asks for a hidden password (at least 14 characters). There is **no default administrator or default admin password**. Seed is optional and imports the five original project stories only when the database is empty.

Open:

- Website: http://localhost:8080
- Studio: http://localhost:8080/admin/
- Readiness check: http://localhost:8080/health/ready

Use exactly `localhost`, not `127.0.0.1`, for this configuration: the API checks the configured origin. This uses the production application image, PostgreSQL, migrations, proxy and persistent volumes. The local-only difference is HTTP rather than a public TLS certificate. Secure cookies and real TLS can be tested on an HTTPS staging subdomain using the production instructions.

`npm run setup` creates ignored configuration and separate randomly generated application and database-owner passwords. It keeps existing configuration instead of overwriting it. The `.secrets` directory has restricted access; its password files are readable by the non-root container user. Never commit `.secrets`, `.env`, `.env.development`, production uploads or backups.

Useful commands:

```sh
docker compose ps
docker compose logs -f app
docker compose logs --tail 100 proxy
docker compose restart app
docker compose down
```

`docker compose down` retains your content. **Do not use `down -v` on an installation whose data you need.**

## Daily development with automatic reload

This mode runs Node on your computer and only PostgreSQL in Docker. Stop the full local stack first so you know which copy you are editing.

```sh
npm ci
npm run setup
docker compose down
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run build
npm run migrate
npm run seed
npm run admin:create -- --email your.name@yourcompany.com
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin/. If you already created that administrator in the same PostgreSQL volume, omit `admin:create` and use that account. The API reads `.env.development`; the development script rebuilds public files on change and restarts Node when server code changes. Refresh the browser after editing a public asset.

Development uploads are saved to `var/uploads`, whereas Docker uploads live in the Docker volume. Do not mix the two environments with valuable content. Use a separate Compose project (`docker compose -p atj-dev ...`) for completely separate local data. See [Development](docs/DEVELOPMENT.md) for the matching commands and troubleshooting.

## Production deployment on your own server

Use a **fresh directory and fresh configuration** on the server. The domain may be purchased anywhere. Point its DNS A record at your server, allow ports 80/443 and install Docker with Compose v2 and Node.js 24 for the setup command.

```sh
npm run setup -- --domain events.yourcompany.com
docker compose up -d --build
docker compose run --rm --no-deps app node scripts/seed.mjs
docker compose exec app node scripts/admin.mjs --email your.name@yourcompany.com
```

Caddy requests and renews HTTPS certificates for the configured domain. Only the proxy is public; PostgreSQL and the application port remain on the private Docker network. A public hostname, working DNS and reachable ports are required for certificate issuance.

**If `.env` already exists**, setup deliberately preserves it. Edit `PUBLIC_ORIGIN`, `SITE_ADDRESS`, `HTTP_PORT=80`, `HTTPS_PORT=443` and `ALLOW_INSECURE_LOCAL=0`, then recreate the containers. Do not reuse local HTTP settings on a public server.

Before opening the site publicly, follow [Deployment](docs/DEPLOYMENT.md), complete the staging checks in [Testing](docs/TESTING.md), and schedule the maintenance and off-server backups in [Operations](docs/OPERATIONS.md).

## Run tests

```sh
npm ci
npm run build
npm run check
npm test
```

The default suite uses PGlite, a PostgreSQL engine compiled to WebAssembly, for isolated database-backed API tests. It also exercises the original application orchestration and all 25 combinations of templates and positions. It is not a substitute for a production PostgreSQL service or GPU/browser tests.

For real PostgreSQL, set `ATJ_TEST_DATABASE_URL` to a **dedicated test database** and run:

```sh
npm run test:postgres
```

For desktop Chromium and mobile WebKit tests:

```sh
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

These start an isolated, loopback-only test server, create disposable test content and never use your normal `.env` database. To run browser tests against PostgreSQL rather than PGlite, also set `ATJ_TEST_DRIVER=postgres` and `ATJ_TEST_DATABASE_URL`. See [Testing](docs/TESTING.md) for Windows environment-variable syntax, the test matrix, and verification limits for this delivered version.

## Documentation

- [Editor guide](docs/EDITOR-GUIDE.md) — manage projects, positions, images and enquiries.
- [Architecture](docs/ARCHITECTURE.md) — data flow, storage and how the 3D scene is generated.
- [Development](docs/DEVELOPMENT.md) — local development, production-like testing and troubleshooting.
- [Deployment](docs/DEPLOYMENT.md) — domain, TLS, server rollout and updates.
- [Operations](docs/OPERATIONS.md) — backup, restore, retention, access and monitoring.
- [API](docs/API.md) — endpoints, schemas, authentication and error responses.
- [Testing](docs/TESTING.md) — checks, browser suite, CI and release acceptance.
- [Security](docs/SECURITY.md) — controls, trust boundaries and deployment requirements.

The public website loads current published data on each page load. An already-open venue must be refreshed to receive newly published changes. The project has no connection to a hosted CMS service and can run entirely on your own server.
