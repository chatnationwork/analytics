# Deployment Guide

This guide explains how to deploy the Analytics Platform on any server using pre-built Docker images from the GitHub Container Registry. The images run smoothly on fresh environments—migrations create the full schema automatically.


## Steps

### 1. Setup Directory and Configuration

Create a folder for the application and download the necessary configuration files.

```bash
# Create directory
mkdir shuru_connect && cd shuru_connect

# Download docker-compose.prod.yml (Production config)
curl -o docker-compose.yml https://raw.githubusercontent.com/chatnationwork/analytics/main/docker-compose.prod.yml

# Download environment template
curl -o .env https://raw.githubusercontent.com/chatnationwork/analytics/main/.env.example
```

### 2. Configure Environment

Edit the `.env` file to set your production secrets (database passwords, JWT secret, etc.).

```bash
nano .env
```

**Required for Docker:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `SERVER_API_URL` | `http://dashboard-api:3001` | Dashboard UI → API (container network) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` or your public URL | Browser → API |
| `FRONTEND_URL` | `http://localhost:3002` or your public URL | For emails, invite links |
| `DASHBOARD_API_PORT` | `3001` | Host port for API |
| `DASHBOARD_UI_PORT` | `3002` | Host port for UI |
| `COLLECTOR_PORT` | `3000` | Host port for collector |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Your values | PostgreSQL credentials |

Note: `DB_HOST` and `REDIS_HOST` are overridden by docker-compose to `postgres` and `redis` for container-to-container communication.


### 3. Deploy

Run the following commands to pull the latest images and start the application.

```bash
# Pull the latest images from GitHub (no login required)
docker-compose pull

# Start the services in the background
docker-compose up -d
```

### 4. Verify

Check if the containers are running:

```bash
docker-compose ps
```

You should see 6 services running: `postgres`, `redis`, `collector`, `processor`, `dashboard-api`, and `dashboard-ui`.

## Updating the Application

To update to the latest version in the future:

```bash
# 1. Stop current services
docker-compose down

# 2. Pull simplest updates
docker-compose pull

# 3. Start again
docker-compose up -d
```

---

## Fresh Deploy (First Run)

On a **new database** (e.g. `docker compose down -v` then `up`), the dashboard-api runs migrations on startup. The migration chain creates the full schema, including:

- Base tables (users, tenants, projects, events, sessions, identities, etc.)
- Agent system (teams, team_members, inbox_sessions, messages, etc.)
- RBAC and later migrations

**First startup may take 30–60 seconds** while migrations run. After that, the API listens on port 3001 and the UI is available at the configured port (default 3002).

---

## Troubleshooting

### Dashboard UI shows "fetch failed" or "ECONNREFUSED"

The Dashboard UI cannot reach the Dashboard API.

**1. API still starting**

Migrations on first run take 30–60 seconds. Wait and refresh.

**2. Wrong `SERVER_API_URL`**

From inside the UI container, use the Docker service name:

- ✅ `SERVER_API_URL=http://dashboard-api:3001`
- ❌ `SERVER_API_URL=http://localhost:3001`

**3. API crashed**

Check logs:

```bash
docker compose logs dashboard-api
```

Fix any reported errors (e.g. missing env vars, DB connection) and restart:

```bash
docker compose down && docker compose up -d
```

**4. Verify API is up**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/dashboard/auth/signup-available
```

`200` or `401` means the API is running.
