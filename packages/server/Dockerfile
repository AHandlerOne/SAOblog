# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Prisma engine download mirror (override with --build-arg if needed)
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install dependencies (allow build scripts for native modules)
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Use PostgreSQL schema for production build
RUN cp packages/server/prisma/schema-postgres.prisma packages/server/prisma/schema.prisma

# Re-run install to link workspace packages correctly after copying source
RUN pnpm install --no-frozen-lockfile

# Build shared first, then generate Prisma client and build server
RUN pnpm --filter @sao/shared build
RUN cd packages/server && sh -c "for i in 1 2 3; do npx prisma generate --no-hints && break || sleep 5; done" && npx tsc

# ---- Stage 2: Production ----
FROM node:18-alpine AS production

RUN apk add --no-cache libc6-compat dumb-init openssl
WORKDIR /app

ENV NODE_ENV=production
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install production dependencies only (prisma + @prisma/client are prod deps)
RUN pnpm install --prod --no-frozen-lockfile

# Copy built output from builder
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy Prisma schema and generate client in production stage
COPY packages/server/prisma ./packages/server/prisma
RUN cp packages/server/prisma/schema-postgres.prisma packages/server/prisma/schema.prisma
RUN cd packages/server && sh -c "for i in 1 2 3; do npx prisma generate --no-hints && break || sleep 5; done"

# Copy entrypoint script
COPY packages/server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create upload directories
RUN mkdir -p /app/uploads/public /app/uploads/tmp

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
