# Developer Guides

These guides cover setup, integration, and operations for the **Kra Analytics Platform** (built for Kenya Revenue Authority).

## 1. Setup & Deployment

- **Docker (Recommended)**:
  - Run `docker-compose up -d --build` to start all services (Collector, Processor, API, UI, Postgres, Redis).
  - Environment variables are defined in `.env`.
- **Local Dev**:
  - Install dependencies: `npm install`
  - Run `npm run start:dev` inside each app folder (`apps/collector`, `apps/dashboard-api`).
  - UI: `cd packages/dashboard-ui && npm run dev`.

## 2. Testing

- **Event Ingestion**:
  - Use Postman Collection (`docs/api/general_postman_collection.json`).
  - Endpoint: `POST /v1/capture`
  - Payload: See `api/README.md`.
- **WhatsApp Webhook**:
  - Use `ngrok` to expose local port 3000.
  - Metadeveloper Portal -> Config -> Callback URL: `https://<ngrok>/v1/webhooks/whatsapp`.

## 3. Debugging

- **Processor Logs**: `docker logs analytics-processor -f`
  - Look for "Synced message to Inbox" or "Skipping duplicate".
- **Database**:
  - Connect: `docker exec -it analytics-postgres psql -U analytics -d analytics`
  - Check Events: `SELECT * FROM events ORDER BY timestamp DESC LIMIT 5;`
  - Check Messages: `SELECT * FROM messages ORDER BY "createdAt" DESC LIMIT 5;`

## 4. Troubleshooting common issues

- **"Session expired" / 401 for all users after deploying nginx**:
  - See [nginx_proxy.md](./nginx_proxy.md).
  - Ensure `/api/` proxies to Next.js (port 3002), not directly to the backend.
- **Messages not showing in Inbox**:
  - Check if "Sync Logic" is active in Processor (requires rebuild).
  - Check `direction` column in `messages` table.
  - Verify `tenantId` handling in Handover Webhook.
