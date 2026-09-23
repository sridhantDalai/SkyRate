# ==============================================================================
# SkyRate Next.js Frontend - Production Dockerfile
# Multi-stage build with pnpm, standalone output, and unprivileged runtime.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Alpine Image with PNPM
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# libc6-compat is recommended for Alpine compatibility with Next.js binaries
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Enable pnpm via Corepack matching package.json packageManager (pnpm@11.9.0)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# ------------------------------------------------------------------------------
# Stage 2: Install Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy lockfiles and manifests
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install exact production + development dependencies needed to compile
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# Stage 3: Build Next.js Application (Standalone)
# ------------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production build arguments (can be overridden at build time via --build-arg)
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG BACKEND_INTERNAL_URL=http://backend:8000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile production bundle with standalone server
RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 4: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# OCI Metadata Labels
LABEL org.opencontainers.image.title="SkyRate Next.js Frontend" \
      org.opencontainers.image.description="Interactive Airfare Intelligence & CPI Index Dashboard" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="SkyRate Engineering Team" \
      org.opencontainers.image.licenses="Proprietary"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create dedicated non-root user (UID/GID 10001)
RUN addgroup -g 10001 -S nodejs \
    && adduser -S nextjs -u 10001 -G nodejs

# Copy static public assets
COPY --from=builder /app/public ./public

# Automatically leverage standalone output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Container Health Check targeting frontend root
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
