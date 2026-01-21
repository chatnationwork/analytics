# Deployment Guide

## Overview
This guide covers infrastructure setup, environment configuration, and deployment procedures for the Analytics Service.

---

## 1. Architecture Overview

```
                    ┌──────────────┐
                    │   CDN/LB     │
                    │  (Cloudflare)│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Collector │ │Collector │ │Collector │
        │ Node 1   │ │ Node 2   │ │ Node 3   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │
                    │  Streams  │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Processor │ │Processor │ │Processor │
        │ Worker 1 │ │ Worker 2 │ │ Worker 3 │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                    ┌─────▼─────┐
                    │ClickHouse │
                    │  Cluster  │
                    └───────────┘
```

---

## 2. Infrastructure Requirements

### Minimum (Development/Staging)

| Component | Spec | Count |
|-----------|------|-------|
| Collector | 1 vCPU, 1GB RAM | 1 |
| Processor | 1 vCPU, 1GB RAM | 1 |
| Redis | 1 vCPU, 1GB RAM | 1 |
| ClickHouse | 2 vCPU, 4GB RAM | 1 |
| Dashboard API | 1 vCPU, 1GB RAM | 1 |

### Production

| Component | Spec | Count |
|-----------|------|-------|
| Collector | 2 vCPU, 2GB RAM | 3+ |
| Processor | 2 vCPU, 2GB RAM | 3+ |
| Redis (Cluster) | 2 vCPU, 4GB RAM | 3 (HA) |
| ClickHouse | 4 vCPU, 16GB RAM | 3 (Replicated) |
| Dashboard API | 2 vCPU, 2GB RAM | 2+ |

---

## 3. Environment Variables

### Collector Service

```env
# Server
PORT=3000
NODE_ENV=production

# Authentication
ALLOWED_WRITE_KEYS=key1,key2,key3
ALLOWED_ORIGINS=https://tax.app,https://app.tax.co.ke

# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_STREAM_KEY=analytics_events

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Processor Service

```env
# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_STREAM_KEY=analytics_events
REDIS_CONSUMER_GROUP=processors
REDIS_CONSUMER_NAME=processor-1

# Database
CLICKHOUSE_HOST=clickhouse-cluster
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=analytics_writer
CLICKHOUSE_PASSWORD=<secret>

# Enrichment
MAXMIND_LICENSE_KEY=<geoip-key>
MAXMIND_DB_PATH=/data/GeoLite2-City.mmdb

# Processing
BATCH_SIZE=100
FLUSH_INTERVAL_MS=1000

# Logging
LOG_LEVEL=info
```

### Dashboard API

```env
# Server
PORT=4000
NODE_ENV=production

# Database (read replica)
CLICKHOUSE_HOST=clickhouse-read
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=analytics_reader
CLICKHOUSE_PASSWORD=<secret>

# Auth
JWT_SECRET=<secret>
SESSION_EXPIRY_HOURS=24

# CORS
ALLOWED_ORIGINS=https://dashboard.tax.app
```

---

## 4. Docker Compose (Development)

```yaml
version: '3.8'

services:
  collector:
    build: ./collector
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on:
      - redis

  processor:
    build: ./processor
    environment:
      - REDIS_URL=redis://redis:6379
      - CLICKHOUSE_HOST=clickhouse
    depends_on:
      - redis
      - clickhouse

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql

  dashboard-api:
    build: ./dashboard-api
    ports:
      - "4000:4000"
    environment:
      - CLICKHOUSE_HOST=clickhouse
    depends_on:
      - clickhouse

volumes:
  redis_data:
  clickhouse_data:
```

---

## 5. Kubernetes Deployment

### Collector Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-collector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-collector
  template:
    metadata:
      labels:
        app: analytics-collector
    spec:
      containers:
        - name: collector
          image: your-registry/analytics-collector:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          envFrom:
            - secretRef:
                name: collector-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-collector
spec:
  selector:
    app: analytics-collector
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: analytics-collector-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - analytics-api.yourdomain.com
      secretName: analytics-tls
  rules:
    - host: analytics-api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: analytics-collector
                port:
                  number: 80
```

---

## 6. Database Setup

### ClickHouse Initialization

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS analytics;

-- Create events table (see database_schema.md for full schema)
CREATE TABLE analytics.events (...);

-- Create materialized views for sessions
CREATE MATERIALIZED VIEW analytics.sessions_mv ...;

-- Create user roles
CREATE USER analytics_writer IDENTIFIED BY '<password>';
CREATE USER analytics_reader IDENTIFIED BY '<password>';

GRANT INSERT ON analytics.events TO analytics_writer;
GRANT SELECT ON analytics.* TO analytics_reader;
```

---

## 7. Monitoring & Alerting

### Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Collector Request Rate | Prometheus | N/A (baseline) |
| Collector Error Rate | Prometheus | > 1% |
| Collector Latency P95 | Prometheus | > 200ms |
| Redis Queue Length | Redis INFO | > 10,000 |
| Processor Lag | Custom metric | > 30s |
| ClickHouse Insert Rate | ClickHouse system | < 80% capacity |
| ClickHouse Disk Usage | ClickHouse system | > 80% |

### Grafana Dashboard

Import dashboard JSON from `monitoring/grafana-dashboard.json`:
- Request rate by endpoint
- Error rate by type
- Latency histogram
- Queue depth over time
- Database insert rate

### Alerting Rules (Prometheus)

```yaml
groups:
  - name: analytics
    rules:
      - alert: CollectorHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Analytics collector error rate > 1%"

      - alert: QueueBacklog
        expr: redis_stream_length{stream="analytics_events"} > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Analytics event queue backlog"

      - alert: ProcessorLag
        expr: analytics_processor_lag_seconds > 30
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Analytics processor falling behind"
```

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] GeoIP database downloaded
- [ ] SSL certificates provisioned
- [ ] CORS origins configured
- [ ] Write keys generated and distributed

### Deployment Steps

1. **Deploy Infrastructure**
   ```bash
   kubectl apply -f k8s/redis/
   kubectl apply -f k8s/clickhouse/
   ```

2. **Initialize Database**
   ```bash
   kubectl exec -it clickhouse-0 -- clickhouse-client < init-db.sql
   ```

3. **Deploy Services**
   ```bash
   kubectl apply -f k8s/collector/
   kubectl apply -f k8s/processor/
   kubectl apply -f k8s/dashboard-api/
   ```

4. **Verify Health**
   ```bash
   curl https://analytics-api.yourdomain.com/health
   ```

5. **Configure SDK**
   - Add write key to client app environment
   - Deploy client app with SDK enabled

### Post-Deployment Verification

- [ ] Health endpoint returns 200
- [ ] Test event ingested successfully
- [ ] Event visible in ClickHouse
- [ ] Dashboard loads and shows data
- [ ] Alerts configured and tested

---

## 9. Rollback Procedure

```bash
# Rollback collector to previous version
kubectl rollout undo deployment/analytics-collector

# Verify rollback
kubectl rollout status deployment/analytics-collector

# If database migration needs rollback
clickhouse-client < migrations/rollback-v1.sql
```
