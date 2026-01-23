# Analytics Dashboard - Master Reference

> **Purpose**: Single source of truth consolidating all business documentation. Updated Jan 2026.

---

## 1. System Overview

The Analytics Dashboard tracks user behavior across two channels:
- **Web** - Page views, clicks, funnels, conversions
- **WhatsApp** - Messages, campaigns, agent performance, AI classification

### Architecture
- **Event-Based (Stateless)** - All data flows as events through Redis → Processor → PostgreSQL
- **No Real-Time State** - Cannot track "live" metrics like open chats or agent online status

---

## 2. What We Currently Track

### 2.1 Data Fields Collected

| Category | Fields | Source |
|:---------|:-------|:-------|
| **Events** | name, timestamp, properties, userId, sessionId | SDK/Webhooks |
| **Sessions** | duration, eventCount, entryPage, exitPage, converted | Aggregated |
| **Users** | traits (email, phone, name), firstSeen, lastSeen | Identify calls |
| **Pages** | path, title, views | Page events |
| **WhatsApp** | messages, responseTime, readRate, agentId | Webhooks |
| **AI** | intent, confidence, latency, errors | AI Agent events |
| **Geo/Device** | country, city, deviceType, browser, OS | Enrichment |

### 2.2 Event Types

| Event | Description | Channel |
|:------|:------------|:--------|
| `page_view` | User viewed a page | Web |
| `session.start` | New session began | Web |
| `session.converted` | User completed goal | Web |
| `message.received` | User sent WhatsApp message | WhatsApp |
| `message.sent` | System/Agent sent message | WhatsApp |
| `message.delivered` | Message delivered | WhatsApp |
| `message.read` | Message read | WhatsApp |
| `chat.resolved` | Conversation closed | WhatsApp |
| `agent.handoff` | Bot → Agent transfer | WhatsApp |
| `ai.classification` | AI classified intent | AI |
| `ai.generation` | AI generated response | AI |
| `ai.error` | AI failed | AI |

---

## 3. Dashboard Pages - Current Implementation

### 3.1 Overview Page (`/overview`)
| Component | Status | Description |
|:----------|:------:|:------------|
| Total Sessions | ✅ | Unique session count |
| Total Users | ✅ | Unique identified users |
| Completion Rate | ✅ | Sessions with conversion |
| Avg Duration | ✅ | Session length |
| Traffic by Journey | ✅ | Top page paths |
| Heatmap | ✅ | Activity by hour/day |

### 3.2 Funnel Page (`/funnel`)
| Component | Status | Description |
|:----------|:------:|:------------|
| Configurable Steps | ✅ | User-defined funnel |
| Drop-off Visualization | ✅ | Bar chart with percentages |
| Multiple Journeys | ✅ | MRI, TOT, NIL presets |

### 3.3 Sessions Page (`/sessions`)
| Component | Status | Description |
|:----------|:------:|:------------|
| Session List | ✅ | Filterable table |
| Session Timeline | ✅ | Event sequence |

### 3.4 WhatsApp Analytics (`/whatsapp-analytics`)
| Component | Status | Description |
|:----------|:------:|:------------|
| Messages Received/Sent | ✅ | Count stats |
| Read Rate | ✅ | % of messages read |
| New Contacts | ✅ | New user count |
| Response Time Histogram | ✅ | Real data, median shown |
| Message Volume by Hour | ✅ | Bar chart |
| Activity Heatmap | ✅ | Day × Hour |
| Message Funnel | ✅ | Sent → Delivered → Read → Replied |
| Traffic by Country | ✅ | Top countries table |
| Agent Performance | ✅ | Chats resolved per agent |
| **AI Performance** | ✅ | Classifications, accuracy, latency, errors |
| **Top User Intents** | ✅ | Intent breakdown chart |
| **AI Latency Distribution** | ✅ | Histogram |

### 3.5 User Journey Page (`/journey`)
| Component | Status | Description |
|:----------|:------:|:------------|
| Cross-channel Timeline | ✅ | Web + WhatsApp events |
| Event Details | ✅ | Properties inspector |

---

## 4. What We Can Add (No Architecture Changes)

### Quick Wins - Frontend Only
| Feature | Target Page | Data Source |
|:--------|:------------|:------------|
| Device Type Donut | Overview | `deviceType` field |
| Browser Breakdown | Overview | `browserName` field |
| Daily Active Users Chart | Overview | Distinct users by day |
| Top Pages by Views | Overview | Page view counts |
| Identified vs Anonymous | Overview | userId null check |

### Simple Backend Queries
| Feature | Target Page | Notes |
|:--------|:------------|:------|
| Avg Resolution Time | WhatsApp | From `chat.resolved.durationMinutes` |
| Conversation Length | WhatsApp | From `chat.resolved.messageCount` |
| Session Duration Histogram | Overview | From sessions table |
| Entry/Exit Page Analysis | Sessions | Already in sessions table |
| Error Tracking | New section | `app_error` events |

### Needs Logic But Possible
| Feature | Requirement |
|:--------|:------------|
| Dropped Chats | 30-min inactivity timeout |
| Escalation Rate | Count `agent.handoff` events |
| Agent-level Breakdown | Group metrics by agentId |

---

## 5. What We Cannot Do (Needs Architecture)

These require Phase 2 implementation:

| Feature | Why Not Possible | Required Change |
|:--------|:-----------------|:----------------|
| Open Chats (live) | Stateless architecture | Conversations table |
| Queued Chats | No queue state | Queue integration |
| Agent Status | No presence system | WebSocket/Redis |
| CSAT Scores | Not collecting | CSAT flow + table |
| QA Review | No workflow | QA table + UI |

---

## 6. KRA Report Compatibility

### Self-Serve Journeys (We Control)
| Metric | Status |
|:-------|:------:|
| Started chats | ✅ |
| Resolved chats | ✅ |
| Dropped chats | ✅ (30m timeout logic) |
| Avg first response | ✅ |
| Avg resolution time | ✅ |
| CSAT | ✅ (when collected) |
| Escalation rate | ✅ |

### Assisted Journeys (Needs CRM Webhook)
| Metric | Status |
|:-------|:------:|
| Resolved chats | 🔗 CRM must send `chat.resolved` |
| Response time | 🔗 CRM must send `message.sent` with agentId |
| CSAT | 🔗 CRM must send `csat.submitted` |
| Service name | 🔗 CRM must include in properties |

---

## 7. API Reference

### Overview
| Endpoint | Returns |
|:---------|:--------|
| `GET /api/dashboard/overview` | Sessions, users, conversion, duration |
| `GET /api/dashboard/overview/page-paths` | Top page paths |

### Funnel
| Endpoint | Returns |
|:---------|:--------|
| `GET /api/dashboard/funnel` | Step counts and percentages |

### Sessions
| Endpoint | Returns |
|:---------|:--------|
| `GET /api/dashboard/sessions` | Paginated session list |
| `GET /api/dashboard/events` | Events for a session |

### WhatsApp Analytics
| Endpoint | Returns |
|:---------|:--------|
| `GET /whatsapp-analytics/stats` | Message counts, read rate |
| `GET /whatsapp-analytics/volume` | Volume by hour |
| `GET /whatsapp-analytics/heatmap` | Day × hour matrix |
| `GET /whatsapp-analytics/agents` | Agent performance |
| `GET /whatsapp-analytics/countries` | Country breakdown |
| `GET /whatsapp-analytics/response-time` | Histogram + median |
| `GET /whatsapp-analytics/funnel` | Message funnel |

### AI Analytics
| Endpoint | Returns |
|:---------|:--------|
| `GET /ai-analytics/stats` | Classifications, accuracy, latency, errors |
| `GET /ai-analytics/intents` | Top intents + confidence |
| `GET /ai-analytics/latency` | Latency distribution |
| `GET /ai-analytics/errors` | Error breakdown |

---

## 8. Chart Types Available

| Story | Primary Chart | We Use |
|:------|:--------------|:-------|
| Trends | Line Chart | ✅ Volume by hour |
| Composition | Donut/Pie | ⏳ Not yet |
| Ranking | Horizontal Bar | ✅ Funnel, intents |
| Time Patterns | Heatmap | ✅ Activity heatmap |
| Distribution | Histogram | ✅ Response time, AI latency |
| Flow | Sankey | ⏳ Not yet |
| Geographic | Map | ⏳ Table only |

---

## 9. Recommended Next Steps

### Phase 1: Dashboard Polish (This Sprint)
1. Add Device Type Donut to Overview
2. Add Daily Active Users line chart
3. Add Session Duration histogram
4. Add Avg Resolution Time to WhatsApp stats

### Phase 2: Event Enrichment (1-2 weeks)
1. Implement `agent.handoff` event from CRM
2. Add `service_name` to event properties
3. Enable Service Channel Performance report

### Phase 3: Stateful Architecture (4-6 weeks)
1. Add `conversations` table
2. Build CSAT collection flow
3. Implement agent presence system
4. Enable Agent Workload & Lifecycle reports

---

## 10. Document Index

| Document | Purpose | Status |
|:---------|:--------|:------:|
| [visualization_catalog.md](./visualization_catalog.md) | Chart types reference | Current |
| [dashboard_requirements.md](./dashboard_requirements.md) | Original spec | Mostly implemented |
| [dashboard_gap_analysis.md](./dashboard_gap_analysis.md) | Gap tracking | Updated Jan 2026 |
| [dashboard_missing_features.md](./dashboard_missing_features.md) | Quick wins list | Current |
| [kra_reports_feasibility.md](./kra_reports_feasibility.md) | KRA report analysis | Current |
| [kra_reports_checklist.md](./kra_reports_checklist.md) | Self-serve vs Assisted | Current |
| [ai_analytics_metrics.md](./ai_analytics_metrics.md) | AI integration value | Current |
