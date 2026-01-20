# Analytics Strategy Pivot: From CRM Polling to Event Collection

## Executive Summary

After thorough evaluation of the CRM API capabilities, we've concluded that **CRM-based analytics cannot meet our dashboard vision**. The API lacks critical data points (response times, growth trends, message history) and has rate limits that make real-time analytics impossible.

**Decision:** Pivot to using our existing **Event Collector infrastructure** for WhatsApp analytics. The same Redis → Processor → Postgres pipeline that powers web analytics will now capture WhatsApp interaction events via webhooks.

---

## 1. The Vision: Storytelling Through Data

Our dashboard is not just a metrics display—it's a **narrative engine** that tells users:

| Story Element | Question Answered | Data Needed | Visualization |
|--------------|-------------------|-------------|---------------|
| **The Big Picture** | How is my business doing overall? | Growth trends, active users, campaign performance | Stat cards, line charts |
| **The User Journey** | What does a typical customer path look like? | Session trails, touchpoints, conversion events | Event timeline, Sankey |
| **Individual Stories** | Who is this specific user and what did they do? | Full event timeline per user | Timeline view |
| **What's Working** | Which campaigns/messages drive results? | A/B performance, funnel analytics | Funnel charts, comparison bars |
| **What's Broken** | Where are users dropping off? | Funnel breakpoints, error events | Funnel with highlights |
| **User Identity** | Who is this person across channels? | Unified identity (phone, email, device) | User profile card |
| **Peak Activity** | When are users most active? | Hourly/daily patterns | Heatmaps |
| **Geographic Reach** | Where are users located? | Country/region data | Maps, region tables |

> **Goal:** A user opens the dashboard and within 30 seconds understands their business health. They can then drill into any user's complete journey from first contact to latest interaction.

> See [Visualization Catalog](./visualization_catalog.md) for detailed chart specifications.

---

## 2. Why CRM Polling Failed

| Requirement | CRM Capability | Gap |
|-------------|----------------|-----|
| Real-time events | ❌ Polling only | Minutes of delay |
| Growth trends | ❌ No `created_at` filter | Cannot track "new today" |
| Response times | ❌ No aggregated endpoint | Must crawl all chats |
| Session tracking | ❌ Not supported | No concept of sessions |
| User journey | ❌ Per-chat messages only | No unified timeline |
| Rate limits | ⚠️ 60 req/min | Breaks at scale |

**Verdict:** The CRM API is designed for **operational workflows** (sending messages, managing contacts), not for **analytical querying** at scale.

---

## 3. The New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN ANALYTICS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WhatsApp CRM                Web SDK                             │
│       │                         │                                │
│       │ (Webhooks)              │ (JS Events)                    │
│       ▼                         ▼                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    COLLECTOR API                         │    │
│  │              (Single Ingestion Point)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Redis Queue   │                          │
│                    └─────────────────┘                          │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │    Processor    │                          │
│                    │  (Enrichment)   │                          │
│                    └─────────────────┘                          │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Events Table  │                          │
│                    │   (Postgres)    │                          │
│                    └─────────────────┘                          │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Dashboard     │                          │
│                    │   (Next.js)     │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits:
- ✅ **Real-time:** Events arrive within seconds, not minutes
- ✅ **Unified:** Web + WhatsApp events in one table
- ✅ **Scalable:** Redis handles burst traffic
- ✅ **Flexible:** Any event type can be captured
- ✅ **User Journeys:** Full timeline per user ID

---

## 4. WhatsApp Events to Capture

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `message.received` | Incoming message | direction, contentType, hasMedia |
| `message.sent` | Outgoing message | direction, templateId, agentId |
| `message.delivered` | Delivery confirmation | deliveredAt |
| `message.read` | Read receipt | readAt |
| `campaign.sent` | Campaign dispatched | campaignId, recipientCount |
| `contact.created` | New contact added | source, customFields |
| `chat.assigned` | Agent takes over | agentId, previousAgentId |
| `chat.resolved` | Conversation closed | resolutionTime, outcome |

---

## 5. Session & Identity Model

### User Identity Resolution
```
userId = whatsapp_number (e.g., "+254712345678")
```

For cross-channel identity:
- WhatsApp: Phone number  
- Web: Anonymous ID → Email on signup
- Match: Phone ↔ Email when available

### Session Definition
- **WhatsApp Session:** 30 minutes of inactivity = new session
- **Session Events:** All events within a session grouped

---

## 6. Implementation Phases

### Phase 1 & 2: Event Ingestion & Storage (Completed Jan 2026)
- [x] Create WhatsApp webhook receiver in Dashboard API
- [x] Transform CRM webhook payloads to standard event format
- [x] Push events to Redis queue
- [x] Update Processor to handle `channel: whatsapp`
- [x] Verify events landing in `events` table
- [x] Build session aggregation queries
- [x] Implement response time calculations (SQL)

### Phase 3: Dashboard Rebuild (In Progress)
- [x] Replace CRM API calls with event queries (`/whatsapp-analytics` endpoint)
- [x] Build user journey visualization (`/journey` page)
- [ ] Implement session browser
- [ ] Real-time event feed

### Phase 4: Advanced Analytics (Week 4+)
- [ ] Funnel builder for WhatsApp flows
- [ ] Cohort analysis
- [ ] Attribution modeling
- [ ] Predictive churn scoring

---

## 7. Success Metrics

| Metric | Current (CRM-based) | Target (Event-based) |
|--------|---------------------|----------------------|
| Data freshness | 5-15 minutes | < 5 seconds |
| Metrics accuracy | 60% (estimated/proxy) | 100% (direct events) |
| User journey depth | None | Full timeline |
| Session tracking | Not possible | Complete |
| Response time calc | Not possible | Exact |

---

## 8. Next Steps

1. **Technical Team:** Implement webhook receiver
2. **Product Team:** Define priority event types
3. **Design:** Update dashboard wireframes for journey view
4. **Testing:** Validate events flowing end-to-end
