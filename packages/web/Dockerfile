# ---- Stage 1: Build ----
FROM node:18 AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Initial install (fetch dependencies)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Ensure workspace links are up to date after copying source
RUN pnpm install --no-frozen-lockfile

# Build shared first, then web
RUN pnpm --filter @sao/shared build && pnpm --filter @sao/web build

# ---- Stage 2: Serve with nginx ----
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from web package
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
