# Nginx Proxy Configuration

## Overview

The `update_nginx.sh` script configures nginx to proxy traffic for the analytics dashboard. This document explains the routing requirements, especially for `/api/` and authentication.

---

## Critical: /api/ Must Proxy to Next.js (Not Backend)

**The `/api/` path must proxy to the Next.js app (port 3002), NOT directly to the Dashboard API (port 3001).**

### Why

1. **Frontend stores the auth token in a cookie** (`accessToken`), not in the `Authorization` header.
2. **The backend expects `Authorization: Bearer <token>`** — it only reads from that header, not from cookies.
3. **The Next.js proxy** (`packages/dashboard-ui/app/api/[...path]/route.ts`) is responsible for:
   - Receiving the request with the cookie
   - Reading `accessToken` from the cookie
   - Adding `Authorization: Bearer <token>` to the request
   - Forwarding to the backend

### What Happens If /api/ Goes Directly to Backend

If nginx proxies `/api/` directly to the backend (port 3001):
- The browser sends the cookie with every request
- The backend receives the request but ignores the cookie
- The backend finds no `Authorization` header → returns 401 Unauthorized
- All authenticated API calls fail (“Session expired”)

### Correct Routing

```
Browser → Nginx (/api/*) → Next.js (port 3002) → Backend (port 3001)
                              ↓
                    Reads cookie, adds Authorization header
```

---

## Nginx Config Summary

| Path      | Proxy Target        | Port | Purpose                                   |
| --------- | ------------------- | ---- | ----------------------------------------- |
| `/api/`   | Next.js (dashboard) | 3002 | Auth: cookie → Bearer; then forward to API |
| `/v1/`    | Collector           | 3000 | SDK events, capture API                   |
| `/`       | Next.js (dashboard) | 3002 | Dashboard UI                               |

---

## Environment Variable

The Next.js proxy needs `SERVER_API_URL` set so it can reach the backend:

- **Same host:** `http://localhost:3001`
- **Docker:** `http://dashboard-api:3001` (or your backend service name)

---

## Applying the Config

```bash
sudo ./update_nginx.sh
```

---

## Troubleshooting

### All users get "Session expired" / 401

- **Cause:** `/api/` is proxied directly to the backend instead of Next.js.
- **Fix:** Ensure `location /api/` uses `proxy_pass http://localhost:3002` (Next.js), not port 3001 (backend).

### Cookie not forwarded

The nginx config includes explicit cookie forwarding for `/api/`:

```nginx
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
```
