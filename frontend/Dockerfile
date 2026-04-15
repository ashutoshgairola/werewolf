FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/public /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/templates/default.conf.template
# nginx docker image runs envsubst on /etc/nginx/templates/*.template at startup
# BACKEND_URL must be set at runtime (e.g. https://your-backend.onrender.com)
ENV BACKEND_URL=http://backend:3000
EXPOSE 80
