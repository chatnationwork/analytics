# CRM API Technical Limitations Report

## Document Purpose
This document catalogs the technical limitations encountered when attempting to build real-time analytics on top of the CRM API. It serves as a reference for engineering decisions and justifies the pivot to event-based collection.

---

## 1. API Architecture Limitations

### 1.1 No Real-Time Event Stream
- **Issue:** CRM provides RESTful polling endpoints only
- **Impact:** Dashboard data is always stale (5-15 min at best)
- **Alternative Required:** Webhooks must be captured directly

### 1.2 Rate Limiting
- **Limit:** ~60 requests/minute (observed)
- **Impact:** Cannot query message histories for >50 chats without hitting limits
- **Calculation:** At 60 req/min, 10,000 contacts = 166 minutes to scan all
- **Blocker:** Real-time response time calculations impossible

### 1.3 No Aggregation Endpoints
- **Issue:** No endpoints for:
  - Average response time
  - Message volume over time
  - Growth rate by period
  - Agent performance metrics
- **Impact:** Must download raw data and compute client-side
- **Cost:** Bandwidth, latency, rate limits

---

## 2. Data Access Gaps

### 2.1 Contact Creation Date
| What We Need | What API Provides |
|--------------|-------------------|
| Filter contacts by `created_at` | ❌ Not supported |
| Get contacts created "today" | ❌ Not supported |
| Historical creation dates | ❌ Not exposed |

**Workaround Attempted:** Daily snapshots stored locally  
**Limitation:** Only provides trend from snapshot start date forward

### 2.2 Message History
| What We Need | What API Provides |
|--------------|-------------------|
| All messages for all contacts | ❌ Per-chat only |
| Messages in time range | ❌ Not supported |
| Global message search | ❌ Not supported |

**Impact:** Cannot calculate:
- Overall response time averages
- Peak messaging hours
- Message volume trends

### 2.3 Agent/Operator Data
| What We Need | What API Provides |
|--------------|-------------------|
| Assigned agent per contact | ⚠️ Requires per-contact fetch |
| Agent resolution stats | ❌ Not available |
| Agent workload distribution | ❌ Not available |

---

## 3. Data Model Limitations

### 3.1 No Session Concept
- CRM tracks "chats" not "sessions"
- No way to group interactions into user sessions
- Cannot build session-based analytics

### 3.2 No Event Timestamps for Key Actions
Missing timestamps for:
- When message was read (only boolean)
- When agent was assigned
- When status changed

### 3.3 Limited Custom Field Queryability
- Custom fields exist but cannot be filtered/searched via API
- Must download all contacts to filter locally

---

## 4. Performance Observations

### Testing Conditions
- Tenant: ~8,500 contacts
- Tests: January 2026

### Results

| Operation | Time | Rate Limit Hit? |
|-----------|------|-----------------|
| List all contacts (paginated) | 45s | No |
| Get messages for 100 chats | 12s | Yes (throttled) |
| Get campaign reports (50 campaigns) | 8s | Yes |
| Calculate avg response time (100 chats) | Timeout | Yes |

---

## 5. Data Freshness Issues

```
Timeline of a typical message:

User sends message         → 0s
CRM receives               → ~500ms
Webhook fires (if configured) → ~1s
API reflects new message   → 30-60s (observed)
Our poll cycle runs        → Every 5 min
Dashboard updates          → 5-6 minutes after event
```

**Verdict:** 5+ minute lag makes "real-time" dashboard impossible

---

## 6. Recommended Path Forward

### Do Not Use CRM API For:
- ❌ Real-time metrics
- ❌ User journey tracking
- ❌ Response time calculations
- ❌ Growth trend analysis
- ❌ Session analytics

### Use CRM API For:
- ✅ Sending messages (operational)
- ✅ Managing contacts (CRUD)
- ✅ Campaign execution (launching campaigns)
- ✅ Campaign report summaries (post-hoc)

### Alternative: Event Collection
Capture webhooks directly and store in our events database for full control over:
- Data freshness
- Aggregation flexibility
- Query performance
- Custom event types

---

## Appendix: API Endpoints Evaluated

| Endpoint | Usability for Analytics |
|----------|------------------------|
| `GET /chats` | ⚠️ Limited - no created_at filter |
| `GET /chats/:id` | ⚠️ Requires N+1 queries |
| `GET /chats/:id/messages` | ❌ Rate-limited, no batch |
| `GET /campaign_messages` | ✅ Good for campaign metrics |
| `GET /campaign_messages/:id/report` | ✅ Good summary stats |
| `POST /chats/:id/messages` | N/A (write only) |
