# API Documentation

## 1. Event Ingestion API
**Base URL**: `https://collector.analytics.chatnationbot.com`

### `/v1/capture` (POST)
Standard endpoint for raw event ingestion.
- **Headers**: `X-Write-Key: <PROJECT_WRITE_KEY>`
- **Body**: `{ "batch": [ <Event Objects> ] }`
- **Use Case**: Web SDK, Server-side SDKs.

### `/v1/webhooks/whatsapp` (POST / GET)
Adapter endpoint for Meta (WABA) webhooks.
- **GET**: Handles `hub.challenge` verification.
- **POST**: Transforms WABA JSON -> `CaptureEventDto` and queues it.
- **Security**: Validates `X-Hub-Signature-256` (Future).

---

## 2. Dashboard & Agent API
**Base URL**: `https://api.analytics.chatnationbot.com`

### Handover Webhook
**Endpoint**: `POST /api/dashboard/agent/integration/handover`
**Auth**: `x-api-key: <TENANT_API_KEY>` or Bearer Token.

Used to transfer a bot conversation to a human agent.

**Payload**:
```json
{
  "userId": "254712345678",
  "name": "John Doe",
  "reason": "Billing Inquiry",
  "history": "...",
  "tenantId": "...",
  "sendHandoverMessage": true,
  "issue": "Payment Failure" 
}
```

### Agent Inbox API
Protected endpoints for the Agent Dashboard UI.
- `GET /agent/inbox`: List assigned sessions.
- `GET /agent/inbox/unassigned`: List queue.
- `GET /agent/inbox/:sessionId`: Get messages.
- `POST /agent/inbox/:sessionId/message`: Send reply (Outbound).
- `PUT /agent/inbox/:sessionId/resolve`: Close session.
