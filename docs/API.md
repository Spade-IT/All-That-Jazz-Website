# API

All endpoints use the website's origin. JSON requests use `Content-Type: application/json`. Database access is server-side only. No CORS access is enabled.

## Authentication

`POST /api/auth/login` accepts `{ "email": "...", "password": "..." }` and requires an `Origin` header exactly equal to `PUBLIC_ORIGIN`. A successful response sets an HttpOnly, SameSite=Strict session cookie and returns an email plus CSRF token. HTTPS uses a Secure `__Host-atj_session` cookie. Tokens expire after 12 hours and are stored only as hashes in the database.

`GET /api/admin/session` returns the current user's email, CSRF token and allowed template/slot metadata. For every authenticated mutation, send the cookie, exact `Origin`, and `X-CSRF-Token`. Logout revokes the session. Password changes revoke all sessions for that administrator.

## Public endpoints

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/venue` | `{stalls: [...]}` containing published snapshots only |
| POST | `/api/enquiries` | Stores an enquiry and returns `{ok:true, reference}` |
| GET | `/media/:uuid.webp` | Image bytes; anonymous only when referenced by a published stall |
| GET | `/health/live` | Process health |
| GET | `/health/ready` | Database readiness |

Enquiry payload:

```json
{
  "name": "Example visitor",
  "company": "Example company",
  "email": "visitor@example.com",
  "eventType": "Corporate event",
  "timeframe": "November",
  "brief": "We would like to discuss our next event.",
  "consent": true,
  "website": "",
  "idempotencyKey": "a UUID generated once per form submission"
}
```

`eventType` must be Corporate event, Dealer & incentive programme, Brand activation, Conference, or Something else. The `website` field is an invisible honeypot: non-empty submissions are acknowledged but not stored. The UUID idempotency key prevents retries from creating duplicates. Public submissions require the exact Origin and are limited to five per IP per hour per app process.

## Admin endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stalls` | All drafts and published snapshots |
| GET | `/api/admin/stalls/:id` | One complete record |
| POST | `/api/admin/stalls` | Create a draft |
| PUT | `/api/admin/stalls/:id` | Save `{revision, draft}` |
| POST | `/api/admin/stalls/:id/publish` | Publish `{revision}` |
| POST | `/api/admin/stalls/:id/unpublish` | Unpublish `{revision}` |
| POST | `/api/admin/stalls/:id/duplicate` | Create a separate draft from `{revision}` |
| DELETE | `/api/admin/stalls/:id` | Delete an unpublished record with `{revision}` |
| GET | `/api/admin/preview/:id` | Private temporary venue containing the saved draft |
| GET | `/api/admin/assets` | Newest 200 image metadata records |
| POST | `/api/admin/assets` | Multipart image upload, one field named `file` |
| GET | `/api/admin/enquiries?page=1&status=all` | Paginated private inbox, 25 items/page |
| PATCH | `/api/admin/enquiries/:id` | Set `{status: "new" | "contacted" | "closed"}` |
| DELETE | `/api/admin/enquiries/:id` | Permanently remove an enquiry |
| GET | `/api/admin/enquiries.csv` | CSV download, newest 10,000 records |
| GET | `/api/admin/audit` | Latest 100 audit events |
| POST | `/api/admin/password` | Change `{current, next}` password |
| POST | `/api/auth/logout` | Revoke current session |

Stall document fields: `name`, `title`, `category`, `client`, `year`, `place`, `summary`, `award`, `mood`, `color`, `template`, `slot`, `sourceUrl`, `coverId`, `logoId`, `sortOrder`.

- Name/headline/category/summary, colour, template and slot are required.
- Templates and slots use `taxi`, `japan`, `usa`, `elite`, `aimc`. They are independent choices.
- Colour is a six-digit hex code. Source URLs must be HTTPS without embedded credentials, or empty.
- Image IDs are existing asset UUIDs or NULL. Sort order is an integer from 0 to 999.
- Text is treated as text, not HTML. Unknown fields are rejected.
- Limits are defined in `server/validation.mjs` and mirrored in the editor.

## Errors

Errors return `{error: "..."}`. Validation also includes `fields: [{field, message}]`.

- 400: invalid content or file.
- 401: missing, invalid or expired session.
- 403: invalid origin or CSRF token.
- 404: missing record or inaccessible private image.
- 409: stale revision, occupied slot or attempted deletion of a published stall.
- 413: upload/body exceeds the allowed size.
- 429: rate limit reached.
- 500: generic server error; internal details are not sent to the browser.
