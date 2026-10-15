# Testing and verification

## Delivered-version results

Verified on 15 October 2026 using Node.js 24.19.0 on Linux:

| Check | Result |
| --- | --- |
| `npm run build` | Passed; generated the public distribution and social preview |
| `npm run check` | Passed; parsed 30 JavaScript source and test files |
| `npm test` | Passed; 20 Node test entries, including an orchestration entry containing 12 checks |
| API/database suite | 12 passing cases using isolated PGlite databases |
| Validation suite | 3 passing cases |
| World geometry suite | 4 passing cases, including all 25 template/position combinations |
| Original-app orchestration | 12 passing checks with mocked DOM/engine |
| Production dependency audit | `npm audit --omit=dev` reported zero known vulnerabilities at verification time |
| Configuration checks | Compose/CI YAML parsed, shell scripts passed Bash syntax checks, documentation links checked |
| Native PostgreSQL 17, Docker build/runtime, TLS and restoration | Included workflows; not executed in this authoring environment |
| Playwright browser suite | Six configured cases (three journeys × two browsers); not executed in this authoring environment |
| Real WebGL rendering, accessibility audit, load and real-device testing | Require staging verification |

There are **31 individual passing checks** when the 12 embedded orchestration checks are counted separately. The Node runner reports 20 entries because it treats the entire orchestration file as one entry. These results do not certify an untested server deployment. Docker, a native PostgreSQL service and supported browser-control facilities were unavailable in the authoring environment.

## Fast checks

```sh
npm ci
npm run build
npm run check
npm test
```

PGlite runs a PostgreSQL engine compiled to WebAssembly. Each API case uses its own database and temporary upload directory, exercises actual API handlers with Fastify injection, and cleans up afterward. No listening HTTP server, production account or production database is needed.

API coverage includes migrations and repeatable seeding, public/private access, cookie flags, Origin and CSRF checks, session revocation, password changes, rate limiting, published snapshot isolation, optimistic edit conflicts, position uniqueness, duplication, invalid image references, image decoding/privacy, enquiry validation/idempotency, CSV formula neutralisation, and audit privacy. Geometry checks verify finite vertices, destinations, independent animations and collision boundaries; they do not render pixels.

## Real PostgreSQL integration

Use a dedicated, disposable PostgreSQL database. The test role must be able to create schemas. Every test creates a random isolated schema and removes it when finished. A forcibly killed run can leave a test schema behind. Never point this at production.

Bash / macOS / Linux:

```sh
export ATJ_TEST_DATABASE_URL='postgresql://test_user:YOUR_TEST_PASSWORD@127.0.0.1:5432/atj_test'
npm run test:postgres
```

PowerShell:

```powershell
$env:ATJ_TEST_DATABASE_URL = 'postgresql://test_user:YOUR_TEST_PASSWORD@127.0.0.1:5432/atj_test'
npm run test:postgres
```

This uses the same assertions with the `pg` connection pool. It verifies server PostgreSQL behaviour; the default PGlite run cannot replace it. Test credentials are separate from `.env` and application credentials.

## Browser journeys

```sh
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Playwright starts an isolated test application at `http://127.0.0.1:3410`, seeds test content and creates a disposable editor account. It refuses to reuse an existing server. Port 3410 must be free. The test account exists only in the isolated test database and is never created by production setup.

The suite covers:

1. Public project browsing, entering the 3D experience or fallback, page errors and mobile width.
2. Creating a stall, previewing privately, publishing, editing a private revision and cleaning up.
3. Submitting an enquiry, finding it in the authenticated inbox and deleting it.

Each journey runs in desktop Chromium and an iPhone-sized WebKit context. By default the database is PGlite. Set `ATJ_TEST_DRIVER=postgres` and `ATJ_TEST_DATABASE_URL` to use the dedicated PostgreSQL database instead. On PowerShell, use `$env:ATJ_TEST_DRIVER = 'postgres'`.

The browser suite checks an allowed WebGL fallback, so it does not prove that the 3D scene rendered successfully on a GPU. Chromium uses software-rendering flags suitable for CI. An emulated iPhone context is not a physical iPhone. Review screenshots and retained failure traces with `npx playwright show-report`.

## Continuous integration

`.github/workflows/ci.yml` defines two jobs:

- A PostgreSQL 17 service, source checks, database integration tests, and Chromium/WebKit journeys.
- Building the production Docker image, starting the Compose stack, checking readiness, seeding and requesting the public API.

These jobs run after you place the project in a GitHub repository with Actions enabled. They were not run remotely as part of this delivery. Review failing jobs before release; do not treat the existence of the workflow as a passing result.

## Production-style local acceptance

Follow README setup to run the entire production stack at `http://localhost:8080`. Confirm migrations complete, readiness returns 200, the administrator can sign in, drafts remain private, publishing changes the refreshed public site, images survive an app restart and enquiries reach the inbox. Restart the stack without deleting volumes and check that content remains.

Use an HTTPS staging domain for Secure cookies, certificates, actual DNS and proxy behaviour. Test the specific devices your audience uses: movement, touch controls, labels, project dialogs, back navigation, image loading, both arcade games, keyboard navigation, zoom and reduced motion. Check actual frame rate and memory use with five published stalls.

Perform and verify a backup/restore drill before launch. Review content and privacy text, configure daily retention maintenance and off-server backups, and monitor readiness and disk use. See [Deployment](DEPLOYMENT.md) and [Operations](OPERATIONS.md).
