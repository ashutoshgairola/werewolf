#!/bin/sh
set -e

# ── Load secret file if present (Render mounts at /etc/secrets/.env) ──────────
if [ -f /etc/secrets/.env ]; then
  set -a
  . /etc/secrets/.env
  set +a
fi

# ── Init postgres if first run ─────────────────────────────────────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initialising PostgreSQL database..."
  su postgres -s /bin/sh -c "initdb -D $PGDATA --auth-local trust --auth-host md5"

  # Start postgres temporarily to run init SQL
  su postgres -s /bin/sh -c "pg_ctl start -D $PGDATA -w -o '-c listen_addresses=127.0.0.1'"

  # Create DB user and database
  su postgres -s /bin/sh -c "psql -c \"CREATE USER \\\"$POSTGRES_USER\\\" WITH PASSWORD '$POSTGRES_PASSWORD';\""
  su postgres -s /bin/sh -c "psql -c \"CREATE DATABASE werewolf OWNER \\\"$POSTGRES_USER\\\";\""

  # Run schema
  su postgres -s /bin/sh -c "psql -d werewolf -f /docker-entrypoint-initdb.d/init.sql"

  # Stop temporary postgres (supervisord will restart it)
  su postgres -s /bin/sh -c "pg_ctl stop -D $PGDATA -m fast"
  echo "PostgreSQL initialised."
fi

# Build DATABASE_URL from parts if not set explicitly
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/werewolf"
fi

# Substitute BACKEND_URL in nginx config (default to localhost since all in one container)
export BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3000}"
envsubst '${BACKEND_URL}' < /etc/nginx/http.d/default.conf > /tmp/default.conf
cp /tmp/default.conf /etc/nginx/http.d/default.conf

exec supervisord -c /etc/supervisord.conf
