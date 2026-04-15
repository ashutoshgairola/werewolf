# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS fe-builder
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* ./
RUN npm install --frozen-lockfile
COPY frontend/ .
# VITE_API_URL empty = same origin (nginx proxy)
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:22-alpine AS be-builder
WORKDIR /be
COPY backend/package.json backend/package-lock.json* backend/pnpm-lock.yaml* ./
RUN npm install --frozen-lockfile
COPY backend/ .
RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Install postgres, nginx, supervisor
RUN apk add --no-cache postgresql16 postgresql16-contrib nginx supervisor

# ── Postgres setup ────────────────────────────────────────────────────────────
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# ── Backend ───────────────────────────────────────────────────────────────────
WORKDIR /app/backend
COPY --from=be-builder /be/dist ./dist
COPY --from=be-builder /be/node_modules ./node_modules
COPY --from=be-builder /be/package.json ./

# ── Frontend (nginx) ──────────────────────────────────────────────────────────
COPY --from=fe-builder /fe/dist /usr/share/nginx/html
COPY --from=fe-builder /fe/public /usr/share/nginx/html
COPY frontend/nginx/default.conf /etc/nginx/http.d/default.conf

# ── DB init script ────────────────────────────────────────────────────────────
COPY db/init.sql /docker-entrypoint-initdb.d/init.sql

# ── Supervisord config ────────────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisord.conf

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
