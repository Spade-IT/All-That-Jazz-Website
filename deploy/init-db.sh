#!/usr/bin/env sh
set -eu
# Runs only on the first start of an empty PostgreSQL volume.
export ATJ_APP_DB_PASSWORD="$(cat /run/secrets/db_password)"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password ATJ_APP_DB_PASSWORD
CREATE ROLE atj LOGIN PASSWORD :'app_password';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE atj TO atj;
GRANT USAGE ON SCHEMA public TO atj;
ALTER DEFAULT PRIVILEGES FOR ROLE atj_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO atj;
ALTER DEFAULT PRIVILEGES FOR ROLE atj_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO atj;
SQL
unset ATJ_APP_DB_PASSWORD
