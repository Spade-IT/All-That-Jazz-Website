# Development and production-style testing

## Requirements

Use Node.js 24 LTS, npm, and Docker with Compose v2. Dependency versions are locked in `package-lock.json`; use `npm ci`, not an uncontrolled dependency update. No system Python is needed.

## Mode A — production-style local stack

```sh
npm run setup
docker compose up -d --build
docker compose run --rm --no-deps app node scripts/seed.mjs
docker compose exec app node scripts/admin.mjs --email you@company.com
```

Website: `http://localhost:8080`; admin: `/admin/`. This uses the production image, real PostgreSQL 17, Caddy, automatic migrations and durable volumes. It deliberately uses local HTTP. The app refuses insecure public origins in production; the `ALLOW_INSECURE_LOCAL=1` exception is restricted to loopback origins.

After code changes:

```sh
docker compose build
docker compose run --rm migrate
docker compose up -d --force-recreate app proxy
```

## Mode B — fast local editing, separate data

Use a separate Compose project so you do not modify the production-style local data. Port 5432 must be free. These commands use the same generated secret files but separate Docker database volumes.

```sh
npm ci
npm run setup
docker compose -p atj-dev -f compose.yaml -f compose.dev.yaml up -d db
npm run build
npm run migrate
npm run seed
npm run admin:create -- --email you@company.com
npm run dev
```

The database becomes reachable only on `127.0.0.1:5432`. `npm run migrate` uses the owner password file from `.env`; the actual application uses the restricted `atj` role from `.env.development`. The Node app listens at `http://localhost:3000`; upload files are under `var/uploads`. Public edits rebuild `dist`, and server edits restart Node. Refresh the browser to see client changes.

To stop this development database:

```sh
docker compose -p atj-dev -f compose.yaml -f compose.dev.yaml down
```

This preserves its database volume. Do not run two PostgreSQL stacks both exposing port 5432.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PUBLIC_ORIGIN` | Exact browser origin, including scheme and local port; no path |
| `NODE_ENV` | `development` or `production` |
| `HOST`, `PORT` | Node binding; use loopback for direct development |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | PostgreSQL connection settings |
| `DB_PASSWORD_FILE` | Application database password file |
| `DB_OWNER_PASSWORD_FILE` | CLI migration owner password file; not mounted into the app service |
| `DATABASE_URL` | Alternative complete connection string for manually managed installations |
| `UPLOAD_DIR` | Persistent path for normalised images |
| `TRUST_PROXY=1` | Trust exactly one reverse proxy hop; only enable behind that proxy |
| `ALLOW_INSECURE_LOCAL=1` | Production-mode HTTP exception for loopback testing only |
| `ENQUIRY_RETENTION_DAYS` | 1–3650; defaults to 365; used by privacy notice and maintenance |
| `LOG_LEVEL` | Structured logging level; default `info` |

Compose explicitly supplies the container connection settings. `.env.development` is used only by `npm run dev`. If you use `DATABASE_URL`, unset `DB_OWNER_PASSWORD_FILE` for migrations and supply an appropriate migration-role URL rather than mixing the two configurations.

## Troubleshooting

- **403 on login or submission:** use the exact `PUBLIC_ORIGIN`. `localhost` and `127.0.0.1` are different origins. Recreate containers after configuration changes.
- **Database authentication fails:** setup never overwrites secrets. Changing a secret file does not change an existing database role password. Follow the rotation instructions in Operations.
- **Migration permission denied:** run the migration service, or use the owner credentials through `DB_OWNER_PASSWORD_FILE` for the host CLI. The app role intentionally cannot create tables.
- **Images disappear when changing modes:** Docker and host development use different upload storage. Restore the matching database and image backup together.
- **Changes not visible:** edit `public`, rebuild, then refresh. `dist` is generated. A currently open venue does not subscribe to live updates.
- **3D cannot initialise:** the public site switches to the project directory. Test GPU support on the actual device; this is not a database error.
- **Publish conflict:** only one published stall may use each position. Save your draft and unpublish its current occupant first.
- **No emails arrive:** enquiries are stored in the inbox; automatic email notifications are not included.
