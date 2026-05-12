#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <instance-id>"
  echo "Example: $0 instance-1"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INSTANCE_ID="$1"
N=$(echo "$INSTANCE_ID" | sed 's/^[^0-9]*//')
if ! echo "$N" | grep -qE '^[0-9]+$'; then
  echo "Error: Could not extract numeric ID from '$INSTANCE_ID'"
  exit 1
fi

PG_PORT=$((5431 + N))
REDIS_PORT=$((6378 + N))
BACKEND_PORT=$((2999 + N))
FRONTEND_PORT=$((4199 + N))
SOCKET_PORT=$((3000 + N))

DB_NAME="booking_db_${INSTANCE_ID}"
CONTAINER_PREFIX="booking-${INSTANCE_ID}"
VOLUME_PREFIX="booking-${INSTANCE_ID}"
NETWORK_NAME="booking-network-${INSTANCE_ID}"

INSTANCE_DIR="${PROJECT_ROOT}/instances/${INSTANCE_ID}"

echo "Generating instance configuration for ${INSTANCE_ID} (N=${N})..."
echo "  PostgreSQL: ${PG_PORT}"
echo "  Redis:      ${REDIS_PORT}"
echo "  Backend:    ${BACKEND_PORT}"
echo "  Frontend:   ${FRONTEND_PORT}"
echo "  Socket:     ${SOCKET_PORT}"

mkdir -p "${INSTANCE_DIR}"

cat > "${INSTANCE_DIR}/docker-compose.yml" << COMPOSE_EOF
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${CONTAINER_PREFIX}-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '${PG_PORT}:5432'
    volumes:
      - ${VOLUME_PREFIX}-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ${NETWORK_NAME}

  redis:
    image: redis:7-alpine
    container_name: ${CONTAINER_PREFIX}-redis
    ports:
      - '${REDIS_PORT}:6379'
    volumes:
      - ${VOLUME_PREFIX}-redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ${NETWORK_NAME}

  backend:
    build:
      context: ../../booking-backend
      dockerfile: Dockerfile.dev
    container_name: ${CONTAINER_PREFIX}-backend
    env_file:
      - backend.env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/${DB_NAME}?schema=public
      REDIS_URL: redis://redis:6379
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - '${BACKEND_PORT}:${BACKEND_PORT}'
    volumes:
      - ../../booking-backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ${NETWORK_NAME}
    command: npm run start:dev

volumes:
  ${VOLUME_PREFIX}-postgres-data:
  ${VOLUME_PREFIX}-redis-data:

networks:
  ${NETWORK_NAME}:
    driver: bridge
COMPOSE_EOF
echo "  OK instances/${INSTANCE_ID}/docker-compose.yml"

cat > "${INSTANCE_DIR}/backend.env" << 'BACKEND_ENV_EOF'
NODE_ENV=development
BACKEND_ENV_EOF
echo "PORT=${BACKEND_PORT}" >> "${INSTANCE_DIR}/backend.env"
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:${PG_PORT}/${DB_NAME}?schema=public" >> "${INSTANCE_DIR}/backend.env"
echo "REDIS_URL=redis://localhost:${REDIS_PORT}" >> "${INSTANCE_DIR}/backend.env"
echo "REDIS_HOST=localhost" >> "${INSTANCE_DIR}/backend.env"
echo "REDIS_PORT=${REDIS_PORT}" >> "${INSTANCE_DIR}/backend.env"
echo "JWT_SECRET=dev-secret-${INSTANCE_ID}" >> "${INSTANCE_DIR}/backend.env"
echo "JWT_EXPIRATION=1h" >> "${INSTANCE_DIR}/backend.env"
echo "JWT_REFRESH_SECRET=dev-refresh-secret-${INSTANCE_ID}" >> "${INSTANCE_DIR}/backend.env"
echo "JWT_REFRESH_EXPIRATION=7d" >> "${INSTANCE_DIR}/backend.env"
echo "CORS_ORIGIN=http://localhost:${FRONTEND_PORT}" >> "${INSTANCE_DIR}/backend.env"
echo "SOCKET_PORT=${SOCKET_PORT}" >> "${INSTANCE_DIR}/backend.env"
{
  echo "SMTP_HOST=smtp.gmail.com"
  echo "SMTP_PORT=587"
  echo "SMTP_SECURE=false"
  echo "SMTP_USER="
  echo "SMTP_PASS="
  echo "SMTP_FROM=noreply@bookingsystem.com"
  echo "PII_ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")"
  echo "PII_HASH_PEPPER=dev-pepper-${INSTANCE_ID}"
} >> "${INSTANCE_DIR}/backend.env"
echo "  OK instances/${INSTANCE_ID}/backend.env"

cat > "${INSTANCE_DIR}/proxy.conf.json" << PROXY_EOF
{
  "/api": {
    "target": "http://localhost:${BACKEND_PORT}",
    "secure": false,
    "logLevel": "debug",
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": "/v1"
    }
  },
  "/socket.io": {
    "target": "http://localhost:${SOCKET_PORT}",
    "ws": true,
    "logLevel": "debug"
  }
}
PROXY_EOF
echo "  OK instances/${INSTANCE_ID}/proxy.conf.json"

cat > "${INSTANCE_DIR}/environment.ts" << ENV_TS_EOF
export const environment = {
  production: false,
  apiUrl: 'http://localhost:${BACKEND_PORT}/v1',
  socketUrl: 'http://localhost:${SOCKET_PORT}',
};
ENV_TS_EOF
echo "  OK instances/${INSTANCE_ID}/environment.ts"

cat > "${INSTANCE_DIR}/environment.prod.ts" << ENV_PROD_TS_EOF
export const environment = {
  production: true,
  apiUrl: 'http://localhost:${BACKEND_PORT}/v1',
  socketUrl: 'http://localhost:${SOCKET_PORT}',
};
ENV_PROD_TS_EOF
echo "  OK instances/${INSTANCE_ID}/environment.prod.ts"

echo ""
echo "Done. Files generated in instances/${INSTANCE_ID}/"
echo ""
echo "To start:"
echo "  cd ${PROJECT_ROOT}"
echo "  docker compose -f instances/${INSTANCE_ID}/docker-compose.yml up -d"
echo ""
echo "To seed the database (first time only):"
echo "  cd ${PROJECT_ROOT}/booking-backend"
echo "  PII_HASH_PEPPER=dev-pepper-${INSTANCE_ID} DATABASE_URL=\"postgresql://postgres:postgres@localhost:${PG_PORT}/${DB_NAME}?schema=public\" npm run prisma:seed"
echo ""
echo "To start the frontend (separate terminal):"
echo "  cd ${PROJECT_ROOT}/booking-frontend && npx ng serve --port=${FRONTEND_PORT} --proxyConfig=../instances/${INSTANCE_ID}/proxy.conf.json"
