# Kubernetes Deployment Guide

This guide provides Kubernetes manifests to deploy the Analytics Platform. It assumes you have a running Kubernetes cluster and `kubectl` configured.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- `kubectl` CLI tool
- A domain name (optional, for Ingress)

## 1. Namespace (Optional)

Create a dedicated namespace for the application to keep resources isolated.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shuru-connect
```

Apply it: `kubectl create namespace shuru-connect`

## 2. Configuration (ConfigMap & Secret)

We separate non-sensitive configuration (ConfigMap) from sensitive data (Secret).

### ConfigMap

Create `config-map.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: analytics-config
  namespace: shuru-connect
data:
  NODE_ENV: "production"
  # Ports
  DASHBOARD_API_PORT: "3001"
  COLLECTOR_PORT: "3000"
  # Service URLs (internal cluster DNS)
  DB_HOST: "analytics-postgres"
  DB_PORT: "5432"
  REDIS_HOST: "analytics-redis"
  REDIS_PORT: "6379"
  SERVER_API_URL: "http://analytics-dashboard-api:3001"
  # Rate Limiting
  RATE_LIMIT_TTL: "60"
  RATE_LIMIT_MAX: "100"
  DEPLOYMENT_MODE: "whitelabel"
  DB_SYNCHRONIZE: "false" # Set to true only for first run if needed, better to use migrations
```

### Secret

Create `secrets.yaml`:

**Note:** A a secret manager . For simplicity, we use a standard Kubernetes Secret here. You must base64 encode your values or use `stringData`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: analytics-secrets
  namespace: shuru-connect
type: Opaque
stringData:
  # Database
  DB_USERNAME: "postgres"
  DB_PASSWORD: "change_me_secure_password"
  DB_DATABASE: "analytics_db"
  
  # JWT & Security
  JWT_SECRET: "change_me_long_random_string"
  ADMIN_API_SECRET: "change_me_admin_api_secret"
  
  # External Services (WhatsApp/Email) - Leave empty if not used yet
  WHATSAPP_ACCESS_TOKEN: ""
  WHATSAPP_PHONE_NUMBER_ID: ""
  RESEND_API_KEY: ""
  EMAIL_FROM: "onboarding@resend.dev"
  
  # Public URLs
  NEXT_PUBLIC_API_URL: "https://your-domain.com/api" 
  FRONTEND_URL: "https://your-domain.com"
```

Apply them:
```bash
kubectl apply -f config-map.yaml
kubectl apply -f secrets.yaml
```

## 3. Data Layer (StatefulSets)

We use `StatefulSet` for databases to ensure data persistence and stable network identities.

### PostgreSQL

Create `postgres.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: analytics-postgres
  namespace: shuru-connect
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
  clusterIP: None # Headless service for StatefulSet
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: analytics-postgres
  namespace: shuru-connect
spec:
  selector:
    matchLabels:
      app: postgres
  serviceName: "analytics-postgres"
  replicas: 1
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
              name: postgres
          envFrom:
            - configMapRef:
                name: analytics-config
            - secretRef:
                name: analytics-secrets
          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: analytics-secrets
                  key: DB_USERNAME
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: analytics-secrets
                  key: DB_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: analytics-secrets
                  key: DB_DATABASE
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 10Gi
```

### Redis

Create `redis.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: analytics-redis
  namespace: shuru-connect
spec:
  ports:
    - port: 6379
  selector:
    app: redis
  clusterIP: None
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: analytics-redis
  namespace: shuru-connect
spec:
  selector:
    matchLabels:
      app: redis
  serviceName: "analytics-redis"
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
              name: redis
          command: ["redis-server", "--appendonly", "yes"]
          volumeMounts:
            - name: redis-data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 5Gi
```

Apply them:
```bash
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml
```

## 4. Application Layer (Deployments)

### Collector Service

Handles event ingestion. High-volume, stateless.

Create `collector.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-collector
  namespace: shuru-connect
spec:
  replicas: 2 # Scale as needed
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
          image: ghcr.io/chatnationwork/analytics-collector:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: analytics-config
            - secretRef:
                name: analytics-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-collector
  namespace: shuru-connect
spec:
  selector:
    app: analytics-collector
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
```

### Processor Service

Worker for processing queues. No external Service needed, just Deployment.

Create `processor.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-processor
  namespace: shuru-connect
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analytics-processor
  template:
    metadata:
      labels:
        app: analytics-processor
    spec:
      containers:
        - name: processor
          image: ghcr.io/chatnationwork/analytics-processor:latest
          envFrom:
            - configMapRef:
                name: analytics-config
            - secretRef:
                name: analytics-secrets
```

### Dashboard API

Main logical backend. Stores uploads in a PVC.

Create `dashboard-api.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-dashboard-api
  namespace: shuru-connect
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analytics-dashboard-api
  template:
    metadata:
      labels:
        app: analytics-dashboard-api
    spec:
      containers:
        - name: dashboard-api
          image: ghcr.io/chatnationwork/analytics-dashboard-api:latest
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: analytics-config
            - secretRef:
                name: analytics-secrets
          volumeMounts:
            - name: media-uploads
              mountPath: /app/uploads/media
          # Health check
          livenessProbe:
            exec:
              command:
                - wget
                - --no-verbose
                - --tries=1
                - --spider
                - http://127.0.0.1:3001/api/dashboard/auth/signup-available
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: media-uploads
          persistentVolumeClaim:
            claimName: media-uploads-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-dashboard-api
  namespace: shuru-connect
spec:
  selector:
    app: analytics-dashboard-api
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: media-uploads-pvc
  namespace: shuru-connect
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

### Dashboard UI

Next.js frontend.

Create `dashboard-ui.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-dashboard-ui
  namespace: shuru-connect
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analytics-dashboard-ui
  template:
    metadata:
      labels:
        app: analytics-dashboard-ui
    spec:
      containers:
        - name: dashboard-ui
          image: ghcr.io/chatnationwork/analytics-dashboard-ui:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: analytics-config
            - secretRef:
                name: analytics-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-dashboard-ui
  namespace: shuru-connect
spec:
  selector:
    app: analytics-dashboard-ui
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
```

Apply them:
```bash
kubectl apply -f collector.yaml
kubectl apply -f processor.yaml
kubectl apply -f dashboard-api.yaml
kubectl apply -f dashboard-ui.yaml
```

## 5. Exposing Services (Ingress)

You need to expose the **Collector** (port 3000) and the **Dashboard UI** (port 3000). The API is typically accessed via the UI's internal routing or exposed separately if you have external API consumers.

Here is an example `ingress.yaml` using NGINX Ingress Controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: analytics-ingress
  namespace: shuru-connect
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    # 1. Dashboard UI
    - host: analytics.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: analytics-dashboard-ui
                port:
                  number: 3000
    
    # 2. Collector (Event Ingestion)
    # Using a sub-path or separate subdomain
    - host: collector.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: analytics-collector
                port:
                  number: 3000
```

Apply Ingress:
```bash
kubectl apply -f ingress.yaml
```

## Verification

Check status of all resources:

```bash
kubectl get all -n shuru-connect
```

You should see:
- 2 StatefulSets (postgres, redis)
- 4 Deployments (collector, processor, dashboard-api, dashboard-ui)
- Services for all except processor
- Running pods for all components
