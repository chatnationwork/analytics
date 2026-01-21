# Analytics API Specification

This document details the HTTP API for the Analytics Collector service.

## Base URL
`https://analytics-api.yourdomain.com/v1`

## Endpoints

### 1. Capture Event (`POST /capture`)
Ingests a batch of events from the client SDK.

*   **Auth**: Public (CORS restricted) or Write Key header.
*   **Content-Type**: `application/json`

**Request Body:**
```json
{
  "batch": [
    {
      "event_name": "page_view",
      "timestamp": "2023-10-27T10:00:00Z",
      "event_id": "...",
      "anonymous_id": "...",
      "context": { ... },
      "properties": { ... }
    },
    {
      "event_name": "click",
      ...
    }
  ],
  "sent_at": "2023-10-27T10:00:05Z" // Time when packet was sent (for clock skew correction)
}
```

**Response:**
*   `200 OK`: `{ "status": "success" }`
*   `400 Bad Request`: Validation error.
*   `413 Payload Too Large`: Batch size exceeded (Max 500KB).

### 2. Identify User (`POST /identify`)
Alternatively, identification can be a specific endpoint or just an event type in `/capture`. We recommend using `/capture` with `type: "identify"`.

### 3. Health Check (`GET /health`)
Used by load balancers.
*   **Response**: `200 OK` `{ "status": "ok", "version": "1.0.0" }`

## Authentication
Since this is a client-side API, extensive secrets cannot be used.
*   **Write Key**: A public UUID identifying the Project/Tenant. Sent in header `X-Write-Key` or body.
*   **Origin Validation**: The collector should strictly check the `Origin` header against allowed domains for the tenant.

## Rate Limiting
*   Apply rate limits per IP address (e.g., 100 requests per minute) to prevent abuse. Or per `anonymous_id`.
