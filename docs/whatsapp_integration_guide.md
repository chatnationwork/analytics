# WhatsApp Analytics Integration Guide

## For CRM/WhatsApp System Developers

This document describes how to send WhatsApp events to the Analytics Collector API.

---

## 1. Overview

Send events to our collector whenever something happens in WhatsApp:
- Message received from user
- Message sent to user
- Message delivered/read
- Contact created
- Chat assigned to agent

**Endpoint:** `POST /v1/capture`  
**Base URL:** `https://collector.analytics.chatnation.co.ke` (or your collector URL)

---

## 2. Authentication

Include your Write Key in the header:

```
X-Write-Key: your_write_key_here
```

---

## 3. Base Payload Structure

Every event follows this format:

```json
{
  "batch": [
    {
      "type": "track",
      "event": "event_name",
      "userId": "+254712345678",
      "timestamp": "2026-01-19T12:00:00.000Z",
      "context": {
        "channel": "whatsapp",
        "library": {
          "name": "crm-whatsapp",
          "version": "1.0.0"
        }
      },
      "properties": {
        // Event-specific data
      }
    }
  ]
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"track"` for events |
| `event` | string | Event name (see section 4) |
| `userId` | string | WhatsApp phone number (e.g., `"+254712345678"`) |
| `timestamp` | ISO 8601 | When the event occurred |
| `context.channel` | string | Always `"whatsapp"` |
| `properties` | object | Event-specific data |

---

## 4. Event Types

### 4.1 Message Received

**When:** User sends a message to your WhatsApp number

```json
{
  "type": "track",
  "event": "message.received",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "messageId": "wamid.xxx",
    "chatId": "chat_123",
    "direction": "inbound",
    "contentType": "text",
    "contentLength": 42,
    "hasMedia": false,
    "mediaType": null
  }
}
```

### 4.2 Message Sent

**When:** You send a message to a user

```json
{
  "type": "track",
  "event": "message.sent",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:01:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "messageId": "wamid.yyy",
    "chatId": "chat_123",
    "direction": "outbound",
    "contentType": "template",
    "templateId": "welcome_v2",
    "agentId": "agent_456",
    "isAutomated": false
  }
}
```

### 4.3 Message Delivered

**When:** Message successfully delivered to user's phone

```json
{
  "type": "track",
  "event": "message.delivered",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:01:05.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "messageId": "wamid.yyy",
    "deliveredAt": "2026-01-19T12:01:05.000Z"
  }
}
```

### 4.4 Message Read

**When:** User reads your message

```json
{
  "type": "track",
  "event": "message.read",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:02:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "messageId": "wamid.yyy",
    "readAt": "2026-01-19T12:02:00.000Z"
  }
}
```

### 4.5 Contact Created

**When:** New contact added to CRM

```json
{
  "type": "track",
  "event": "contact.created",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "chatId": "chat_123",
    "name": "John Doe",
    "source": "organic",
    "countryCode": "KE",
    "customFields": {
      "segment": "premium",
      "referrer": "campaign_spring"
    }
  }
}
```

### 4.6 Chat Assigned

**When:** Chat is assigned to an agent

```json
{
  "type": "track",
  "event": "chat.assigned",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T12:03:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "chatId": "chat_123",
    "agentId": "agent_456",
    "previousAgentId": null,
    "assignmentType": "manual"
  }
}
```

### 4.7 Chat Resolved

**When:** Conversation is marked as resolved/closed

```json
{
  "type": "track",
  "event": "chat.resolved",
  "userId": "+254712345678",
  "timestamp": "2026-01-19T14:00:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "chatId": "chat_123",
    "agentId": "agent_456",
    "resolutionType": "resolved",
    "messageCount": 12,
    "durationMinutes": 120
  }
}
```

### 4.8 Campaign Sent

**When:** Broadcast campaign is dispatched

```json
{
  "type": "track",
  "event": "campaign.sent",
  "userId": "system",
  "timestamp": "2026-01-19T09:00:00.000Z",
  "context": {
    "channel": "whatsapp"
  },
  "properties": {
    "campaignId": "camp_789",
    "campaignName": "January Promo",
    "templateId": "promo_v3",
    "recipientCount": 5000,
    "scheduledAt": "2026-01-19T09:00:00.000Z"
  }
}
```

---

## 5. Session Handling

For WhatsApp, sessions are handled automatically by the analytics system:
- **Session timeout:** 30 minutes of inactivity = new session
- **No session ID needed:** We create sessions based on `userId` and timestamps

You do NOT need to send a `sessionId` - just send the events with accurate timestamps.

---

## 6. Example: Full Conversation Flow

```javascript
// 1. User sends first message (new contact)
POST /v1/capture
{
  "batch": [
    { "event": "contact.created", "userId": "+254712345678", ... },
    { "event": "message.received", "userId": "+254712345678", ... }
  ]
}

// 2. Agent is assigned
POST /v1/capture
{
  "batch": [
    { "event": "chat.assigned", "userId": "+254712345678", ... }
  ]
}

// 3. Agent replies
POST /v1/capture
{
  "batch": [
    { "event": "message.sent", "userId": "+254712345678", ... }
  ]
}

// 4. User reads and replies
POST /v1/capture
{
  "batch": [
    { "event": "message.read", "userId": "+254712345678", ... },
    { "event": "message.received", "userId": "+254712345678", ... }
  ]
}

// 5. Chat resolved
POST /v1/capture
{
  "batch": [
    { "event": "chat.resolved", "userId": "+254712345678", ... }
  ]
}
```

---

## 7. Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200, 201 | Success | Event queued |
| 400 | Invalid payload | Check JSON format |
| 401 | Unauthorized | Check Write Key |
| 429 | Rate limited | Back off and retry |
| 500 | Server error | Retry with backoff |

**Recommended:** Use a retry queue for failed events.

---

## 8. Testing

Test your integration:

```bash
curl -X POST https://collector.analytics.chatnation.co.ke/v1/capture \
  -H "Content-Type: application/json" \
  -H "X-Write-Key: your_write_key" \
  -d '{
    "batch": [{
      "type": "track",
      "event": "message.received",
      "userId": "+254700000000",
      "timestamp": "2026-01-19T12:00:00.000Z",
      "context": { "channel": "whatsapp" },
      "properties": {
        "messageId": "test_123",
        "direction": "inbound",
        "contentType": "text"
      }
    }]
  }'
```

---

## 9. Metrics Derived from These Events

| Metric | Calculation |
|--------|-------------|
| **Response Time** | Time between `message.received` and next `message.sent` |
| **Daily New Contacts** | Count `contact.created` per day |
| **Read Rate** | `message.read` count / `message.sent` count |
| **Agent Performance** | Events grouped by `agentId` |
| **Peak Hours** | `message.received` grouped by hour |
| **Conversation Length** | `messageCount` from `chat.resolved` |

---

## Questions?

Contact the Analytics team for support.
