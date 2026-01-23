# Complete Tracking Guide

> **Audience**: All developers integrating with the Analytics Collector.

This guide consolidates what you need to track to fully populate the analytics dashboard. For detailed examples, see the channel-specific guides:
- [Web Tracking Guide](./tracking_guide_web.md)
- [WhatsApp Tracking Guide](./tracking_guide_whatsapp.md)
- [AI Tracking Guide](./tracking_guide_ai.md)

---

## Quick Reference: Dashboard → Events

| Dashboard Section | Required Events |
|:------------------|:----------------|
| **Overview** → Sessions & Users | `page_view`, `session.start` |
| **Overview** → Completion Rate | Conversion events (see Funnels) |
| **Overview** → Device/Browser | Auto-collected by SDK/processor |
| **Overview** → Daily Active Users | Any event with `anonymousId` |
| **Funnel** | Step events with consistent naming |
| **WhatsApp** → Message Volume | `message.received`, `message.sent` |
| **WhatsApp** → Read Rate | `message.read` |
| **WhatsApp** → Response Time | Time between `message.received` → `message.sent` |
| **WhatsApp** → Agent Performance | `chat.resolved` with `agentId` |
| **AI** → Classifications | `ai.classification` |
| **AI** → Accuracy | `ai.classification` with `confidence` |
| **AI** → Latency | `ai.classification` with `latency_ms` |
| **AI** → Error Rate | `ai.error` |

---

## Event Summary by Channel

### Web Events

| Event | Required | Powers |
|:------|:---------|:-------|
| `page_view` | ✅ | Sessions, top pages, journey tracking |
| `identify` | ✅ | User identity, identified user % |
| `track` (custom) | Recommended | Funnel analysis, conversion tracking |

### WhatsApp Events

| Event | Required | Powers |
|:------|:---------|:-------|
| `message.received` | ✅ | Volume, response time, heatmap |
| `message.sent` | ✅ | Volume, funnel, agent tracking |
| `message.delivered` | Recommended | Delivery rate |
| `message.read` | Recommended | Read rate |
| `chat.resolved` | ✅ | Resolution time, conversation length |
| `contact.created` | Recommended | Growth tracking, country breakdown |

### AI Events

| Event | Required | Powers |
|:------|:---------|:-------|
| `ai.classification` | ✅ | Classifications, intents, accuracy, latency |
| `ai.generation` | Optional | Generation tracking |
| `ai.error` | ✅ | Error rate, error breakdown |

---

## Critical Properties

### For All Events

| Property | Type | Description |
|:---------|:-----|:------------|
| `userId` | string | User identifier (phone, email, ID) |
| `timestamp` | ISO 8601 | When the event occurred |
| `context.channel` | string | `web`, `whatsapp`, or `mobile` |

### For AI Events

| Property | Type | Description |
|:---------|:-----|:------------|
| `detected_intent` | string | Intent name (consistent naming!) |
| `confidence` | float | 0-1 confidence score |
| `latency_ms` | int | Inference time in ms |
| `error_type` | string | Error category for `ai.error` |
| `recovered` | boolean | Whether error was recovered |

### For WhatsApp Events

| Property | Type | Description |
|:---------|:-----|:------------|
| `agentId` | string | Agent identifier (for agent-sent messages) |
| `messageCount` | int | Messages in conversation (for `chat.resolved`) |
| `durationMinutes` | number | Conversation duration (for `chat.resolved`) |
| `countryCode` | string | ISO country code |

---

## Payload Format

All events should be sent as:

```json
{
  "type": "track",
  "event": "event_name",
  "userId": "user_identifier",
  "timestamp": "2026-01-23T10:00:00.000Z",
  "properties": {
    // Event-specific properties
  },
  "context": {
    "channel": "whatsapp"  // or "web"
  }
}
```

**Batch submission:**

```json
POST /v1/capture
{
  "batch": [
    { "type": "track", "event": "..." },
    { "type": "track", "event": "..." }
  ]
}
```

---

## Implementation Priority

### Phase 1: Core (Must Have)
1. ✅ Web: `page_view`, `identify`, core conversion events
2. ✅ WhatsApp: `message.received`, `message.sent`, `chat.resolved`
3. ✅ AI: `ai.classification` with `confidence` + `latency_ms`

### Phase 2: Enhanced Analytics
1. WhatsApp: `message.delivered`, `message.read` for funnel
2. AI: `ai.error` for error tracking
3. WhatsApp: `contact.created` for growth tracking

### Phase 3: Advanced
1. Custom funnel events for specific journeys
2. AI: Token usage tracking for cost analysis
3. Agent performance optimization

---

## Integration Checklist

### Web
- [ ] SDK installed
- [ ] `page()` called on route changes
- [ ] `identify()` after login
- [ ] Key conversion events tracked

### WhatsApp
- [ ] Webhook processing messages
- [ ] `message.received` for inbound
- [ ] `message.sent` with `agentId` for agent messages
- [ ] `chat.resolved` with `durationMinutes` + `messageCount`

### AI
- [ ] `ai.classification` for every intent detection
- [ ] `confidence` 0-1 range included
- [ ] `latency_ms` tracked
- [ ] `ai.error` for failures with `error_type`
