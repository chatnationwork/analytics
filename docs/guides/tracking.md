# Event Tracking Guide

This guide explains how to send analytics events to the **Collector API** from any external application (backend or frontend).

## Endpoint Overview

All events are sent to a single endpoint:

- **URL**: `http://localhost:3000/v1/capture` (Local)
- **Method**: `POST`
- **Headers**:
  - `Content-Type`: `application/json`
  - `x-write-key`: `YOUR_PROJECT_WRITE_KEY` (Required for authentication)

---

## Event Payload Structure

Every event requires a `type` and usually `userId` or `anonymousId`.

### Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Event type: `track`, `page`, `identify`, `screen` |
| `anonymousId` | String | Yes* | UUID to track session/device. Required if `userId` is missing. |
| `userId` | String | No | Known user ID (e.g., from your DB). |
| `timestamp` | String | No | ISO-8601 date. Defaults to current server time if omitted. |
| `context` | Object | No | Device info (User-Agent, IP, Locale). |
| `properties` | Object | No | Custom data specific to the event. |

---

## Examples

### 1. cURL (Terminal)

**Track a button click:**

```bash
curl -X POST http://localhost:3000/v1/capture \
  -H "Content-Type: application/json" \
  -H "x-write-key: wk_123456789" \
  -d '{
    "type": "track",
    "event": "Button Clicked",
    "anonymousId": "550e8400-e29b-41d4-a716-446655440000",
    "properties": {
      "button_id": "signup_hero",
      "color": "blue"
    }
  }'
```

---

### 2. JavaScript (Frontend/Node.js)

Using `fetch` API:

```javascript
const TRACKING_URL = 'http://localhost:3000/v1/capture';
const WRITE_KEY = 'wk_123456789';

async function trackEvent(eventName, properties = {}) {
  const payload = {
    type: 'track',
    event: eventName,
    anonymousId: 'user-session-id-123', // In a real app, generate/store this in cookie
    context: {
      userAgent: navigator.userAgent,
      locale: navigator.language
    },
    properties: properties
  };

  try {
    const response = await fetch(TRACKING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-write-key': WRITE_KEY
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
        console.log('Event tracked!');
    }
  } catch (error) {
    console.error('Tracking failed', error);
  }
}

// Usage
trackEvent('Added to Cart', { productId: 'p_99', price: 29.99 });
```

---

### 3. Python (Backend)

Using `requests` library:

```python
import requests
import uuid
from datetime import datetime

url = "http://localhost:3000/v1/capture"
headers = {
    "Content-Type": "application/json",
    "x-write-key": "wk_123456789"
}

payload = {
    "type": "track",
    "event": "Order Completed",
    "userId": "u_8823",
    "timestamp": datetime.utcnow().isoformat(),
    "properties": {
        "orderId": "ord_555",
        "total": 120.50,
        "currency": "USD"
    }
}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 201:
    print("Success")
else:
    print(f"Failed: {response.text}")
```
