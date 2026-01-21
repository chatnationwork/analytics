# Dashboard Requirements

## Overview
This document specifies the analytics dashboard visualizations, their queries, and filtering requirements.

---

## 1. Dashboard Views

### 1.1 Executive Overview

**Purpose**: High-level KPIs for stakeholders.

| Metric | Description | Query Pattern |
|--------|-------------|---------------|
| **Total Sessions** | Unique session count | `COUNT(DISTINCT session_id)` |
| **Total Users** | Unique identified users | `COUNT(DISTINCT user_id)` |
| **Conversion Rate** | Sessions with `return_filed` | Filed / Total Sessions |
| **Avg Session Duration** | Time from first to last event | Aggregate from sessions table |

**Filters**: Date range, obligation type (MRI/TOT/NIL)

**Visualization**: Stat cards with trend sparklines

---

### 1.2 Funnel Analysis

**Purpose**: Visualize drop-off at each step of user journeys.

#### MRI Journey Funnel

```
Step 1: page_view (path = '/') ────────────────▶ 100%
                                                   │
Step 2: click (element = 'btn-mri-start') ────▶  65%
                                                   │
Step 3: validation_success ───────────────────▶  58%
                                                   │
Step 4: otp_verified ─────────────────────────▶  52%
                                                   │
Step 5: page_view (path = '/mri/rental-income')▶ 50%
                                                   │
Step 6: return_filed ─────────────────────────▶  42%
                                                   │
Step 7: payment_initiated ────────────────────▶  38%
                                                   │
Step 8: payment_success ──────────────────────▶  35%
```

**Query Pattern**:
```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'page_view' AND page_path = '/' THEN session_id END) as step_1,
  COUNT(DISTINCT CASE WHEN event_name = 'click' AND properties->>'element' = 'btn-mri-start' THEN session_id END) as step_2,
  COUNT(DISTINCT CASE WHEN event_name = 'validation_success' THEN session_id END) as step_3,
  -- ... continue for all steps
FROM events
WHERE tenant_id = ? AND timestamp BETWEEN ? AND ?;
```

**Visualization**: Horizontal bar chart with percentages

---

### 1.3 Session Explorer

**Purpose**: Drill-down view of individual user sessions.

**Features**:
- Timeline of events in a session
- Event properties inspector
- Link to user profile (if identified)

**Query**:
```sql
SELECT * FROM events
WHERE session_id = ?
ORDER BY timestamp ASC;
```

**Visualization**: Vertical timeline with event cards

---

### 1.4 User Profile

**Purpose**: Unified view of a user's activity across sessions.

**Sections**:
1. **Identity**: Name, PIN, Phone, Email
2. **Session List**: All sessions with timestamps
3. **Event History**: Paginated list of all events
4. **Metrics**: Total sessions, conversions, last seen

**Query**:
```sql
-- Get user traits
SELECT traits FROM identities WHERE user_id = ?;

-- Get all sessions
SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC;

-- Get recent events
SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100;
```

---

### 1.5 Real-Time Activity

**Purpose**: Live view of events as they happen.

**Features**:
- Auto-refreshing event stream
- Filter by event type
- Highlight errors

**Implementation**: WebSocket or polling `/events/stream` endpoint

**Visualization**: Scrolling log with event badges

---

### 1.6 Error Tracking

**Purpose**: Monitor `app_error` events.

**Metrics**:
- Error count by type
- Affected sessions percentage
- Error trend over time

**Query**:
```sql
SELECT
  properties->>'error_code' as error_code,
  COUNT(*) as occurrences,
  COUNT(DISTINCT session_id) as affected_sessions
FROM events
WHERE event_name = 'app_error'
  AND timestamp BETWEEN ? AND ?
GROUP BY error_code
ORDER BY occurrences DESC;
```

**Visualization**: Table with error codes, bar chart for trends

---

## 2. Filtering System

### Global Filters (Apply to all views)

| Filter | Type | Options |
|--------|------|---------|
| **Date Range** | Date picker | Last 7d, 30d, 90d, Custom |
| **Obligation Type** | Multi-select | MRI, TOT, NIL |
| **Device Type** | Multi-select | Desktop, Mobile, Tablet |
| **Country** | Multi-select | KE, UG, TZ, ... |

### View-Specific Filters

| View | Additional Filters |
|------|-------------------|
| Funnel | Journey type (MRI/TOT/NIL) |
| Session Explorer | Session ID, Anonymous ID |
| User Profile | User ID, Phone, PIN |
| Errors | Error code, Severity |

---

## 3. API Endpoints

### 3.1 Overview Stats
```
GET /api/dashboard/overview
Query: ?start_date=2024-01-01&end_date=2024-01-31&obligation=mri

Response:
{
  "total_sessions": 12500,
  "total_users": 8200,
  "conversion_rate": 0.42,
  "avg_session_duration_seconds": 245
}
```

### 3.2 Funnel Data
```
GET /api/dashboard/funnel
Query: ?journey=mri&start_date=...&end_date=...

Response:
{
  "steps": [
    { "name": "View Home", "count": 10000, "percent": 100 },
    { "name": "Start MRI", "count": 6500, "percent": 65 },
    ...
  ]
}
```

### 3.3 Session List
```
GET /api/dashboard/sessions
Query: ?user_id=A012345678X&limit=50&offset=0

Response:
{
  "sessions": [
    {
      "session_id": "abc-123",
      "started_at": "2024-01-15T10:30:00Z",
      "duration_seconds": 180,
      "event_count": 12,
      "converted": true
    }
  ],
  "total": 15
}
```

### 3.4 Event Stream
```
GET /api/dashboard/events
Query: ?session_id=abc-123

Response:
{
  "events": [
    {
      "event_id": "...",
      "event_name": "page_view",
      "timestamp": "...",
      "properties": { ... }
    }
  ]
}
```

---

## 4. Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | All views, user PII visible, export data |
| **Analyst** | All views, masked PII, no export |
| **Viewer** | Overview and Funnel only, no PII |

---

## 5. Export Capabilities

| Format | Use Case |
|--------|----------|
| CSV | Raw event export for external analysis |
| PDF | Funnel reports for stakeholders |
| Scheduled Email | Weekly digest to stakeholders |
