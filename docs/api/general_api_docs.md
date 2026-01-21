# Analytics API Documentation

## Overview

This document describes the REST API endpoints for the Analytics system.

---

## Authentication

All requests to the Collector API require a **write key** for authentication.

### How to Authenticate

Include the write key in the `X-Write-Key` header:

```http
POST /v1/capture HTTP/1.1
Host: analytics.yourdomain.com
Content-Type: application/json
X-Write-Key: your-write-key-here
```

Or include it in the request body:

```json
{
  "write_key": "your-write-key-here",
  "batch": [...]
}
```

### Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Missing X-Write-Key header | No write key provided |
| 401 | Invalid write key | Write key doesn't match any project |
| 401 | Origin not allowed | Request origin not in allowedOrigins |

---

## Collector API (Port 3000)

### POST /v1/capture

Receive a batch of analytics events from the SDK.

**Rate Limit:** 100 requests per minute per IP

#### Request Body

```typescript
{
  "batch": [
    {
      "event_id": "uuid",          // Required: Unique event ID
      "event_name": "page_view",    // Required: Event name
      "event_type": "track",        // Optional: "page", "track", "identify"
      "timestamp": "ISO8601",       // Required: When event occurred
      "anonymous_id": "uuid",       // Required: Browser ID
      "user_id": "string",          // Optional: Logged-in user ID
      "session_id": "uuid",         // Required: Current session
      "context": {
        "page": {
          "path": "/mri/validation",
          "title": "MRI Validation",
          "url": "https://...",
          "referrer": "https://..."
        },
        "userAgent": "Mozilla/5.0...",
        "library": {
          "name": "@analytics/sdk",
          "version": "1.0.0"
        }
      },
      "properties": {               // Optional: Custom event properties
        "button_id": "submit-form",
        "return_type": "mri"
      }
    }
  ],
  "sent_at": "ISO8601"              // Required: When batch was sent
}
```

#### Response (200 OK)

```json
{
  "status": "success"
}
```

#### Error Response (400/401/500)

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /v1/health

Health check endpoint for load balancers.

#### Response (200 OK)

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Dashboard API (Port 3001)

All dashboard endpoints return data wrapped in a standard response:

```json
{
  "status": "success",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /api/dashboard/overview

Get high-level KPIs for the dashboard.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | ISO date (e.g., 2024-01-01) |
| endDate | string | Yes | ISO date (e.g., 2024-01-31) |
| tenantId | string | No | Tenant filter (default: default-tenant) |

#### Response

```json
{
  "status": "success",
  "data": {
    "totalSessions": 1500,
    "totalUsers": 1200,
    "conversionRate": 0.42,
    "avgSessionDuration": 245
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /api/dashboard/funnel

Get funnel analysis data for a specific journey.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| journey | string | No | Journey type: mri, tot, nil (default: mri) |
| startDate | string | Yes | ISO date |
| endDate | string | Yes | ISO date |
| tenantId | string | No | Tenant filter |

#### Response

```json
{
  "status": "success",
  "data": {
    "journey": "mri",
    "steps": [
      { "name": "View Home", "count": 1000, "percent": 100 },
      { "name": "Start MRI", "count": 800, "percent": 80 },
      { "name": "Validation Success", "count": 600, "percent": 60 },
      { "name": "OTP Verified", "count": 500, "percent": 50 },
      { "name": "Return Filed", "count": 400, "percent": 40 },
      { "name": "Payment Initiated", "count": 350, "percent": 35 }
    ]
  }
}
```

---

### GET /api/dashboard/sessions

Get a paginated list of sessions.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | ISO date |
| endDate | string | Yes | ISO date |
| limit | number | No | Items per page (default: 50) |
| offset | number | No | Items to skip (default: 0) |
| tenantId | string | No | Tenant filter |

#### Response

```json
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "sessionId": "uuid",
        "anonymousId": "uuid",
        "userId": "user@example.com",
        "startedAt": "2024-01-15T10:00:00.000Z",
        "endedAt": "2024-01-15T10:15:00.000Z",
        "durationSeconds": 900,
        "eventCount": 25,
        "pageCount": 8,
        "entryPage": "/",
        "deviceType": "mobile",
        "countryCode": "KE",
        "converted": true,
        "conversionEvent": "return_filed"
      }
    ],
    "total": 1500
  }
}
```

---

### GET /api/dashboard/events

Get all events for a specific session.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string | Yes | Session UUID |

#### Response

```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "eventId": "uuid",
        "eventName": "page_view",
        "eventType": "page",
        "timestamp": "2024-01-15T10:00:00.000Z",
        "pagePath": "/",
        "pageTitle": "Home",
        "deviceType": "mobile",
        "browserName": "Chrome",
        "properties": null
      },
      {
        "eventId": "uuid",
        "eventName": "button_click",
        "eventType": "track",
        "timestamp": "2024-01-15T10:00:30.000Z",
        "pagePath": "/",
        "properties": { "button_id": "start-mri" }
      }
    ]
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid write key |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
