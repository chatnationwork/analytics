# =============================================================================
# Multi-stage Dockerfile for NestJS Analytics Services
# =============================================================================

# Base image with Node.js
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

# =============================================================================
# Collector API
# =============================================================================
FROM base AS collector
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/apps/collector/main.js"]

# =============================================================================
# Processor Worker
# =============================================================================
FROM base AS processor
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
CMD ["node", "dist/apps/processor/main.js"]

# =============================================================================
# Dashboard API (runs migrations on startup, then starts the app)
# =============================================================================
FROM base AS dashboard-api
WORKDIR /app
# Full node_modules so we have ts-node for migrations
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
# Source for datasource + migrations (needed for npm run db:migrate)
COPY --from=builder /app/libs/database ./libs/database
COPY --from=builder /app/libs/common ./libs/common
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/scripts/docker-dashboard-api-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-dashboard-api-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./scripts/docker-dashboard-api-entrypoint.sh"]
