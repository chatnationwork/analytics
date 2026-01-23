# WhatsApp Tracking Guide

> **Audience**: Developers integrating WhatsApp webhook events with the collector.

---

## What This Powers

Sending these events will populate the following dashboard sections:

| Dashboard Section | What It Shows |
|:------------------|:--------------|
| **WhatsApp Analytics** → Messages Received/Sent | Volume stats |
| **WhatsApp Analytics** → Read Rate | % of messages read |
| **WhatsApp Analytics** → Response Time | Time to first response |
| **WhatsApp Analytics** → Message Volume by Hour | Hourly distribution |
| **WhatsApp Analytics** → Activity Heatmap | Day × hour patterns |
| **WhatsApp Analytics** → Message Funnel | Sent → Delivered → Read → Replied |
| **WhatsApp Analytics** → Traffic by Country | Geographic breakdown |
| **WhatsApp Analytics** → Agent Performance | Chats resolved per agent |

---

## Required Events

### 1. message.received
Fire when a user sends a message inbound.

```json
{
  "type": "track",
  "event": "message.received",
  "userId": "+254712345678",
  "timestamp": "2026-01-23T10:00:00.000Z",
  "properties": {
    "messageId": "wamid.abc123",
    "contentType": "text",
    "hasMedia": false,
    "chatId": "chat_456"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

### 2. message.sent
Fire when the system or agent sends a message outbound.

```json
{
  "type": "track",
  "event": "message.sent",
  "userId": "+254712345678",
  "timestamp": "2026-01-23T10:05:00.000Z",
  "properties": {
    "messageId": "wamid.def456",
    "contentType": "text",
    "templateId": "welcome_v2",
    "agentId": "agent_789"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

**Critical**: Include `agentId` if sent by an agent (enables agent performance tracking).

---

### 3. message.delivered
Fire when message is delivered to user's device.

```json
{
  "type": "track",
  "event": "message.delivered",
  "userId": "+254712345678",
  "properties": {
    "messageId": "wamid.def456"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

### 4. message.read
Fire when user reads the message.

```json
{
  "type": "track",
  "event": "message.read",
  "userId": "+254712345678",
  "properties": {
    "messageId": "wamid.def456"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

### 5. chat.resolved
Fire when a conversation is marked as resolved.

```json
{
  "type": "track",
  "event": "chat.resolved",
  "userId": "+254712345678",
  "properties": {
    "chatId": "chat_456",
    "agentId": "agent_789",
    "messageCount": 8,
    "durationMinutes": 15,
    "resolution": "completed"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

**Critical**: `messageCount` and `durationMinutes` power conversation length and resolution time charts.

---

### 6. contact.created
Fire when a new contact is created.

```json
{
  "type": "track",
  "event": "contact.created",
  "userId": "+254712345678",
  "properties": {
    "source": "organic",
    "countryCode": "KE"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

## Property Reference

| Property | Type | Required | Description |
|:---------|:-----|:---------|:------------|
| `userId` | string | ✅ | Phone number (E.164 format) |
| `messageId` | string | ✅ | WhatsApp message ID |
| `chatId` | string | ✅ | Conversation identifier |
| `agentId` | string | For agent msgs | Agent identifier |
| `contentType` | string | Recommended | text/image/video/audio/document |
| `templateId` | string | For templates | Template name used |
| `countryCode` | string | Recommended | ISO country code |
| `durationMinutes` | number | For chat.resolved | Conversation duration |
| `messageCount` | number | For chat.resolved | Messages in conversation |

---

## Implementation Checklist

- [ ] Webhook receives WhatsApp events
- [ ] `message.received` fired for inbound messages
- [ ] `message.sent` fired for outbound with `agentId` when applicable
- [ ] `message.delivered` and `message.read` status updates
- [ ] `chat.resolved` with `durationMinutes` and `messageCount`
- [ ] `contact.created` for new contacts
- [ ] `countryCode` included in context or properties
