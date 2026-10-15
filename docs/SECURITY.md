# Security and trust boundaries

The public API exposes only published project data and accepts validated enquiries. Admin APIs require a server-side session. There is no public account creation. Studio users are trusted content editors with full access to enquiries.

Implemented controls:

- Salted asynchronous scrypt password hashes, minimum 14-character passwords, no default credentials.
- Random 256-bit session tokens, token hashes in PostgreSQL, 12-hour expiry, explicit logout and password-reset revocation.
- HttpOnly/SameSite=Strict cookies; Secure and `__Host-` prefix under HTTPS.
- Exact Origin checks and per-session CSRF tokens for admin writes; exact Origin checks for login and enquiry writes.
- Parameterised SQL, strict allowlisted fields and server-side validation.
- Revision checks, row locking and a database unique index for publication safety.
- Image decoding/re-encoding to WebP, byte/pixel limits, random filenames, no SVG/script uploads, private draft image access.
- CSP, no-sniff, referrer policy, same-origin framing and HSTS on HTTPS.
- Hashed account/IP login-throttling keys; process-level public form rate limiting and a honeypot.
- A non-root read-only application container, dropped capabilities, private database networking and separate migration/app database roles.
- Repository and secrets excluded from the public serving root and Docker build context.
- Audit events avoid enquiry bodies and passwords; JSON logs redact cookie/auth fields and rotate.

Security operations remain necessary: maintain the OS/container images, review dependency updates, restrict admin access, rotate secrets, monitor logs, protect backups and schedule retention jobs. The privacy page must match your actual operating practices.

The included rate limiter for public enquiries is per process. Use a shared limiter before scaling to multiple app replicas. The included app trusts one proxy hop; preserve that topology or deliberately reconfigure it. Do not expose port 3000 directly when trust proxy is enabled.

Image content becomes public once associated with a published stall. Unpublishing cannot erase copies already downloaded by visitors; HTTP caches can retain previously public images for up to five minutes. Private previews are not protected share links: they work only for logged-in administrators.

This package has not undergone an independent penetration test. No source-level review or dependency audit can guarantee the absence of vulnerabilities. The release's executed and unexecuted checks are recorded in `TESTING.md`.
