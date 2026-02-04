# Agent System API Specification

## Overview

The Tax Agent classification system needs to check if a user has an active agent session before processing their messages. This document specifies the API endpoint required from the Agent System and **our implementation** in the dashboard API.

---

## Our Implementation

We provide an endpoint that fulfils the required behaviour. Path and auth are adapted to our system.

| Spec item    | Our implementation                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Path**     | `GET /api/dashboard/agent-session/check` (global prefix is `api/dashboard`)                                                                                                            |
| **Query**    | `phone` (required). Optional `tenantId` to scope to a tenant; if omitted we use the tenant from the API key (or check across all tenants when using JWT).                              |
| **Auth**     | Same as handover: **x-api-key** header (or `apiKey` query param) or **Authorization: Bearer &lt;jwt&gt;**. Required.                                                                   |
| **Response** | `200 OK` with `{ "hasActiveSession": boolean }` — `true` when the contact has at least one inbox session with status **assigned** (agent is handling the chat).                        |
| **400**      | Missing `phone`: `{ "message": "Missing required parameter: phone", "error": "Bad Request" }`. Invalid format: `{ "message": "Invalid phone number format", "error": "Bad Request" }`. |
| **401**      | Missing or invalid API key/JWT.                                                                                                                                                        |
| **503**      | Not explicitly returned; 5xx from infrastructure (e.g. DB down) will surface as 500.                                                                                                   |

**Phone format:** We accept E.164-style values (digits only, 10–15 chars). Leading `+` and common separators are stripped for lookup. Stored `contactId` is normalized the same way on handover.

**Example:**

```http
GET /api/dashboard/agent-session/check?phone=254712345678 HTTP/1.1
x-api-key: <your-api-key>
```

```json
{ "hasActiveSession": true }
```

---

## Required Endpoint (Original Spec)

### Check Active Session

**Endpoint (spec):** `GET /api/agent-session/check`  
**Our path:** `GET /api/dashboard/agent-session/check`

**Description:** Returns whether a user (identified by phone number) currently has an active agent session.

**Query Parameters:**

| Parameter | Type   | Required | Description                                  | Example        |
| --------- | ------ | -------- | -------------------------------------------- | -------------- |
| `phone`   | string | Yes      | User's phone number (E.164 format without +) | `254712345678` |

**Response:**

- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "hasActiveSession": boolean
}
```

**Response Fields:**

| Field              | Type    | Description                                                |
| ------------------ | ------- | ---------------------------------------------------------- |
| `hasActiveSession` | boolean | `true` if user has active agent session, `false` otherwise |

---

## Examples

### Example 1: User has active session

**Request:**

```http
GET /api/agent-session/check?phone=254712345678 HTTP/1.1
Host: agent-system.example.com
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "hasActiveSession": true
}
```

### Example 2: User does not have active session

**Request:**

```http
GET /api/agent-session/check?phone=254798765432 HTTP/1.1
Host: agent-system.example.com
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "hasActiveSession": false
}
```

---

## Performance Requirements

- **Response Time:** Must respond within **200ms** under normal load (95th percentile)
- **Availability:** 99.9% uptime during business hours
- **Rate Limiting:** Should support at least 100 requests/second

---

## Error Handling

### Invalid Phone Number

**Request:**

```http
GET /api/agent-session/check?phone=invalid
```

**Response:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Invalid phone number format"
}
```

### Missing Phone Parameter

**Request:**

```http
GET /api/agent-session/check
```

**Response:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Missing required parameter: phone"
}
```

### Service Unavailable

**Response:**

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": "Service temporarily unavailable"
}
```

---

## Integration Notes

### Caching Behavior

Our system will cache the response for **5-10 seconds** to reduce load. Consider this when implementing session state changes - there may be a brief delay before our system recognizes session changes.

### Fail-Open Behavior

If your endpoint:

- Times out (>500ms)
- Returns 5xx errors
- Is unreachable

Our system will **fail-open** and process the message normally (as if `hasActiveSession: false`). This ensures user messages are never blocked by temporary agent system issues.

### Authentication

## If authentication is required, please provide details

## Testing

### Test Scenarios Needed

Please provide test credentials/environment for:

1. **Active session scenario** - Phone number that returns `hasActiveSession: true`
2. **No active session scenario** - Phone number that returns `hasActiveSession: false`
3. **Performance testing** - Staging environment URL for load testing

---

## Configuration

Please provide:

- **Base URL:** `___________` (e.g., `https://agent-system.example.com`)
- **Environment:** Production / Staging / Development
- **Contact for issues:** ****\_\_\_****
- **Deployment date:** ****\_\_\_****

---

## Questions?

Contact: [Your contact information]
