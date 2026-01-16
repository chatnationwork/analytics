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
# Dashboard API
# =============================================================================
FROM base AS dashboard-api
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/apps/dashboard-api/main.js"]
