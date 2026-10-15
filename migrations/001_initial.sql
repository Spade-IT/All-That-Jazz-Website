CREATE TABLE admins (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE,
 password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
 csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE assets (
 id uuid PRIMARY KEY, original_name text NOT NULL, filename text NOT NULL UNIQUE,
 width integer NOT NULL, height integer NOT NULL, bytes integer NOT NULL,
 created_by uuid REFERENCES admins(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE stalls (
 id uuid PRIMARY KEY, draft jsonb NOT NULL, published jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(draft) = 'object'), CHECK (published IS NULL OR jsonb_typeof(published) = 'object')
);
CREATE UNIQUE INDEX one_live_stall_per_slot ON stalls ((published->>'slot')) WHERE published IS NOT NULL;
CREATE TABLE enquiries (
 id uuid PRIMARY KEY, idempotency_key uuid NOT NULL UNIQUE,
 name text NOT NULL, company text NOT NULL, email text NOT NULL,
 event_type text NOT NULL, timeframe text NOT NULL, brief text NOT NULL,
 consent_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiries_created ON enquiries(created_at DESC);
CREATE TABLE audit_log (
 id bigserial PRIMARY KEY, admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
 action text NOT NULL, object_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE login_attempts (
 id bigserial PRIMARY KEY, key_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_lookup ON login_attempts(key_hash,created_at);
