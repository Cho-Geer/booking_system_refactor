# ============================================================
# Stage 1 — Build (Angular production build)
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (leveraged Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source code and build
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — Production (Nginx serving static assets)
# ============================================================
FROM nginx:alpine AS production

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular files from build stage
# Angular 21 @angular/build:application outputs to dist/<project>/browser/
COPY --from=build /app/dist/booking-frontend/browser /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80

# Nginx runs as non-root by default in the official Alpine image
CMD ["nginx", "-g", "daemon off;"]
# ============================================================
# Stage 1 - Build (Angular production build)
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (leveraged Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source code and build
COPY . .
RUN npm run build

# ============================================================
# Stage 2 - Production (Nginx serving static assets)
# ============================================================
FROM nginx:alpine AS production

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular files from build stage
# Angular 21 @angular/build:application outputs to dist/<project>/browser/
COPY --from=build /app/dist/booking-frontend/browser /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80

# Nginx runs as non-root by default in the official Alpine image
CMD ["nginx", "-g", "daemon off;"]
