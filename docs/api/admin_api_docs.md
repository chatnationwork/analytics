# Admin API Documentation

## Overview

Developer-only API endpoints for managing API keys and CRM integrations.
All admin endpoints are secured by the `ADMIN_API_SECRET` environment variable instead of JWT authentication.

The system operates in single-tenant mode — the tenant is automatically resolved from the database. No `tenantId` is needed in requests.

---

## Authentication

All admin requests require the `ADMIN_API_SECRET` in the `Authorization` header:

```http
POST /admin/api-keys HTTP/1.1
Host: analytics.yourdomain.com
Authorization: Bearer your-admin-secret
Content-Type: application/json
```

### Error Responses

| Status | Message                          | Cause                          |
| ------ | -------------------------------- | ------------------------------ |
| 401    | Authorization header is required | No `Authorization` header      |
| 401    | Invalid authorization format     | Missing `Bearer` prefix        |
| 401    | Invalid admin secret             | Secret doesn't match env var   |

### Setup

Add `ADMIN_API_SECRET` to your `.env` file:

```env
ADMIN_API_SECRET=your-secure-secret-here
```

> **Security:** Treat this secret like a password. Only share it with developers/ops who need to manage API keys and CRM integrations.

---

## API Key Management

API keys are used by SDKs and services to authenticate with the analytics platform. Keys are hashed (SHA-256) before storage — the full key is only returned once at creation time.

### POST /admin/api-keys

Generate a new API key.

#### Request Body

| Field       | Type   | Required | Description                                            |
| ----------- | ------ | -------- | ------------------------------------------------------ |
| `name`      | string | Yes      | Human-readable name (e.g., "Production SDK")           |
| `type`      | string | No       | `write` (SDK events) or `read` (API access). Default: `write` |
| `projectId` | string | No       | UUID to scope the key to a specific project            |

#### Example

```bash
curl -X POST http://localhost:3001/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production SDK",
    "type": "write"
  }'
```

#### Response (201 Created)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Production SDK",
  "key": "wk_abc123def456ghi789jkl012mno345pq",
  "keyPrefix": "wk_abc123..",
  "type": "write",
  "createdAt": "2026-02-15T12:00:00.000Z"
}
```

> **Important:** The `key` field is only returned once. Store it securely immediately.

---

### GET /admin/api-keys

List all API keys for the tenant.

#### Example

```bash
curl http://localhost:3001/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

#### Response (200 OK)

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Production SDK",
    "keyPrefix": "wk_abc123...",
    "type": "write",
    "isActive": true,
    "lastUsedAt": "2026-02-15T11:30:00.000Z",
    "createdAt": "2026-02-15T12:00:00.000Z"
  }
]
```

---

### PATCH /admin/api-keys/:id/revoke

Revoke (deactivate) an API key. The key stops working immediately but the record is preserved.

#### Example

```bash
curl -X PATCH http://localhost:3001/admin/api-keys/a1b2c3d4-e5f6-7890-abcd-ef1234567890/revoke \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

#### Response (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

| Status | Message              | Cause                                |
| ------ | -------------------- | ------------------------------------ |
| 404    | API key not found    | Key ID doesn't exist for this tenant |

---

## CRM Integration Management

CRM integrations connect the analytics platform to external CRM systems. API keys for CRM connections are encrypted (AES-256-GCM) at rest and never returned in responses.

> **Note:** These admin endpoints work alongside the dashboard UI — CRM integrations can be managed from either the API or the dashboard.

### POST /admin/crm-integrations

Create a new CRM integration.

#### Request Body

| Field      | Type   | Required | Description                                          |
| ---------- | ------ | -------- | ---------------------------------------------------- |
| `name`     | string | Yes      | Human-readable name (2–100 chars)                    |
| `apiUrl`   | string | Yes      | CRM API base URL                                     |
| `apiKey`   | string | Yes      | CRM API key (min 10 chars, encrypted before storage) |
| `webLink`  | string | No       | Webview base URL for in-chat links                   |
| `csatLink` | string | No       | CSAT survey URL (defaults to `webLink + '/csat'`)    |
| `config`   | object | No       | Provider-specific config (e.g., WhatsApp IDs)        |

#### Example

```bash
curl -X POST http://localhost:3001/admin/crm-integrations \
  -H "Authorization: Bearer $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production WhatsApp",
    "apiUrl": "https://crm.example.com",
    "apiKey": "crm-api-secret-key-here",
    "webLink": "https://web.example.com",
    "config": {
      "phoneNumberId": "123456789",
      "phoneNumber": "+254700000000"
    }
  }'
```

#### Response (201 Created)

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "name": "Production WhatsApp",
  "apiUrl": "https://crm.example.com",
  "webLink": "https://web.example.com",
  "csatLink": null,
  "isActive": true,
  "config": {
    "phoneNumberId": "123456789",
    "phoneNumber": "+254700000000"
  },
  "lastConnectedAt": null,
  "lastError": null,
  "createdAt": "2026-02-15T12:00:00.000Z"
}
```

> **Note:** The CRM API key is never returned in responses. It is encrypted at rest.

---

### GET /admin/crm-integrations

List all CRM integrations.

```bash
curl http://localhost:3001/admin/crm-integrations \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

#### Response (200 OK)

Returns an array of CRM integration objects (same shape as the create response).

---

### GET /admin/crm-integrations/:id

Get a single CRM integration by ID.

```bash
curl http://localhost:3001/admin/crm-integrations/b2c3d4e5-f6a7-8901-bcde-f23456789012 \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

---

### PATCH /admin/crm-integrations/:id

Update an existing CRM integration. Only include fields you want to change.

#### Request Body

| Field      | Type    | Required | Description                              |
| ---------- | ------- | -------- | ---------------------------------------- |
| `name`     | string  | No       | Updated name                             |
| `apiUrl`   | string  | No       | Updated API URL                          |
| `apiKey`   | string  | No       | New API key (re-encrypted before storage) |
| `webLink`  | string  | No       | Updated webview URL                      |
| `csatLink` | string  | No       | Updated CSAT URL                         |
| `isActive` | boolean | No       | Enable/disable the integration           |
| `config`   | object  | No       | Updated provider config                  |

#### Example

```bash
curl -X PATCH http://localhost:3001/admin/crm-integrations/b2c3d4e5-f6a7-8901-bcde-f23456789012 \
  -H "Authorization: Bearer $ADMIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated CRM Name",
    "isActive": false
  }'
```

#### Response (200 OK)

Returns the updated CRM integration object.

---

### DELETE /admin/crm-integrations/:id

Delete a CRM integration permanently.

```bash
curl -X DELETE http://localhost:3001/admin/crm-integrations/b2c3d4e5-f6a7-8901-bcde-f23456789012 \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

#### Response (204 No Content)

No response body.

---

### GET /admin/crm-integrations/:id/test

Test the connection to a CRM integration.

```bash
curl http://localhost:3001/admin/crm-integrations/b2c3d4e5-f6a7-8901-bcde-f23456789012/test \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Connection successful",
  "contactCount": 1234
}
```

#### Failed Connection

```json
{
  "success": false,
  "message": "Connection failed: ECONNREFUSED"
}
```

---

## Common Error Responses

All errors follow this format:

```json
{
  "statusCode": 401,
  "message": "Invalid admin secret",
  "error": "Unauthorized"
}
```

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| 400  | Bad Request — Invalid input data            |
| 401  | Unauthorized — Missing or invalid secret    |
| 403  | Forbidden — Resource belongs to another tenant |
| 404  | Not Found — Resource doesn't exist          |
| 500  | Internal Server Error                       |
