# Phased Development Roadmap

## Overview
This document defines the two-phase rollout strategy: **Web Analytics first**, **WhatsApp integration later**. This ensures a modular architecture with clear extension points.

---

## Phase 1: Web Analytics (Current Focus)

### Scope
Build the complete analytics pipeline for web-based user journeys (Tax App webviews).

### Deliverables

| Component | Description | Status |
|-----------|-------------|--------|
| **Client SDK** | JavaScript tracker with batching, offline cache, session management | 🔲 To Do |
| **Collector API** | `/capture` endpoint with validation, rate limiting | 🔲 To Do |
| **Message Queue** | Redis Streams or Kafka for event buffering | 🔲 To Do |
| **Processor Worker** | Event enrichment (GeoIP, UA parsing), dedup, DB insert | 🔲 To Do |
| **Database** | ClickHouse/PostgreSQL schema for events | 🔲 To Do |
| **Dashboard API** | Query endpoints for funnels, metrics | 🔲 To Do |
| **Dashboard UI** | Visualization frontend | 🔲 To Do |

### Data Model Constraints
- `channel_type` field: Default to `"web"` for all Phase 1 events
- `external_id`: Reserved field (nullable) for future WhatsApp ID linking
- Session logic: 30-minute inactivity timeout, browser-based

### Extension Points (Stubs for Phase 2)
```typescript
// Reserved fields in event schema
interface EventContext {
  channel_type: 'web' | 'whatsapp';  // Phase 1: always 'web'
  external_id?: string;               // Phase 2: WhatsApp phone ID
  handshake_token?: string;           // Phase 2: Cross-channel linking
}
```

---

## Phase 2: WhatsApp Integration (Future)

### Scope
Extend the system to ingest conversational events from WhatsApp and link them to web sessions.

### New Components

| Component | Description |
|-----------|-------------|
| **WhatsApp Webhook Listener** | Receives message events from WhatsApp Business API |
| **Conversation State Machine** | Tracks bot/human states per conversation |
| **Identity Linker** | Maps WhatsApp phone → `anonymous_id` via handshake token |
| **Agent Dashboard** | Real-time view of conversation states and queue times |

### The "Handshake" Mechanism
When a user transitions from WhatsApp to web:
1. Bot generates a unique `handshake_token`
2. Token is embedded in the webview URL: `?hs_token=abc123`
3. Web SDK captures token and sends `handshake_complete` event
4. Backend links WhatsApp `conversation_id` to web `session_id`

```
WhatsApp Bot                    Web SDK
     │                              │
     │── generates token ──────────▶│
     │                              │
     │   URL: /form?hs_token=xyz    │
     │                              │
     │◀──── handshake_complete ─────│
     │      { token: xyz,           │
     │        session_id: abc }     │
```

### State Machine Events (Phase 2)
| Event | Description |
|-------|-------------|
| `conversation_started` | User sends first message |
| `bot_response` | Automated reply sent |
| `agent_assigned` | Human takes over |
| `webview_opened` | User clicks webview link |
| `conversation_resolved` | Session marked complete |

---

## Migration Path

### Database
- Phase 1 schema includes all Phase 2 columns as nullable
- No breaking changes when Phase 2 activates

### SDK
- Phase 1 SDK checks for `hs_token` in URL but ignores if absent
- Phase 2 activates token handling logic

### API
- `/capture` endpoint accepts all event types from day one
- WhatsApp-specific events simply have no sender in Phase 1

---

## Timeline Estimate

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1a | 2 weeks | SDK + Collector + DB |
| Phase 1b | 2 weeks | Processor + Dashboard |
| Phase 2 | 3 weeks | WhatsApp + Handshake |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Web events ingested end-to-end
- [ ] Funnel visualization works for MRI/TOT/NIL journeys
- [ ] Session linking works for returning users

### Phase 2 Complete When:
- [ ] WhatsApp messages appear in timeline
- [ ] Cross-channel journeys show unified view
- [ ] Agent queue metrics available
