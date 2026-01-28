# Analytics Trends & Enhancement Roadmap

> **Document Purpose**: Comprehensive plan for adding trend visualizations and enhanced analytics capabilities, building on the existing event-based architecture.
>
> **Last Updated**: January 2026

---

## 1. Executive Summary

The analytics platform currently captures rich event data from Web and WhatsApp channels, but **lacks trend visualizations** that show changes over time. Additionally, while the **agent-inbox** provides assisted journey support, we lack visibility into **self-serve vs assisted journey metrics**.

This document outlines:

1. **Trend analytics** that can be added with minimal backend changes
2. **Self-serve vs Assisted journey** analytics enhancement
3. **Implementation architecture** building on existing infrastructure
4. **Prioritized roadmap** with effort estimates

---

## 2. Current Data Assets

### 2.1 What We Already Collect

| Data Category    | Fields Available                                                                       | Source         |
| :--------------- | :------------------------------------------------------------------------------------- | :------------- |
| **Events**       | `eventName`, `timestamp`, `properties`, `userId`, `sessionId`, `channelType`           | SDK/Webhooks   |
| **Sessions**     | `durationSeconds`, `eventCount`, `pageCount`, `converted`, `deviceType`, `countryCode` | Processor      |
| **Users**        | `anonymousId`, `userId`, traits (email, phone)                                         | Identify calls |
| **WhatsApp**     | `message.received`, `message.sent`, `message.read`, `chat.resolved`, `contact.created` | Webhooks       |
| **AI**           | `ai.classification`, `ai.generation`, `ai.error` with latency/confidence               | AI Agent       |
| **Agent System** | `InboxSession`, `Message`, `Resolution`, `assignedAgentId`, `teamId`                   | Agent Inbox    |

### 2.2 Existing Visualizations

| Page                   | Current Charts                                                                                     |
| :--------------------- | :------------------------------------------------------------------------------------------------- |
| **Overview**           | Stat cards, Daily Active Users, Device Donut, Browser Breakdown, Page Paths, Activity Heatmap      |
| **Funnel**             | Configurable step funnel with drop-off %                                                           |
| **Sessions**           | Session list, Event timeline                                                                       |
| **WhatsApp Analytics** | Message stats, Response Time Histogram, Volume by Hour, Heatmap, Message Funnel, Agent Performance |
| **Journey**            | User search, Cross-channel event timeline                                                          |
| **Agent Inbox**        | Live chat list, Message window                                                                     |

### 2.3 What's Missing

1. **Time-series trends** (week-over-week, month-over-month comparisons)
2. **Self-serve vs Assisted** journey breakdown
3. **Conversion trends** over time
4. **Response time trends** (is it improving?)
5. **Agent workload trends** (busy periods)
6. **Cohort analysis** (retention over time)

---

## 3. Proposed Trend Analytics

### 3.1 Overview Page Enhancements

#### 3.1.1 Session Trend Chart (Line Chart)

**Visualization**: Multi-line chart showing sessions over time with period comparison.

```
Data Structure:
{
  current: [{ date: '2026-01-01', count: 450 }, ...],
  previous: [{ date: '2025-12-01', count: 380 }, ...],
  percentChange: 18.4
}
```

**Granularity Options**:

- Daily (last 30 days)
- Weekly (last 12 weeks)
- Monthly (last 12 months)

**Backend Query** (add to `session.repository.ts`):

```sql
SELECT
  DATE_TRUNC('day', started_at) as period,
  COUNT(*) as count
FROM sessions
WHERE tenant_id = $1
  AND started_at BETWEEN $2 AND $3
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY period ASC;
```

---

#### 3.1.2 Conversion Rate Trend (Area Chart)

**Visualization**: Area chart showing conversion rate changes over time.

```
Data Structure:
{
  data: [
    { date: '2026-01-01', rate: 0.42, sessions: 450, conversions: 189 },
    ...
  ]
}
```

**Backend Query**:

```sql
SELECT
  DATE_TRUNC('week', started_at) as period,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions,
  CAST(SUM(CASE WHEN converted THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as rate
FROM sessions
WHERE tenant_id = $1 AND started_at BETWEEN $2 AND $3
GROUP BY period
ORDER BY period ASC;
```

---

#### 3.1.3 User Growth Trend (Stacked Area Chart)

**Visualization**: Stacked area showing new vs returning users over time.

```
Data Structure:
{
  data: [
    { date: '2026-01-01', newUsers: 120, returningUsers: 330 },
    ...
  ]
}
```

**Backend Logic**:

- New user: First event for `anonymousId` falls within the period
- Returning user: Has events before the period

---

### 3.2 WhatsApp Analytics Trends

#### 3.2.1 Message Volume Trend (Multi-Line Chart)

**Visualization**: Compare `message.received` vs `message.sent` over time.

```
Data Structure:
{
  data: [
    { date: '2026-01-01', received: 450, sent: 520 },
    ...
  ],
  granularity: 'day' | 'week' | 'month'
}
```

---

#### 3.2.2 Response Time Trend (Line Chart with Target)

**Visualization**: Median response time over time with SLA target line.

```
Data Structure:
{
  data: [
    { date: '2026-01-01', medianMinutes: 3.2, p95Minutes: 8.5 },
    ...
  ],
  targetMinutes: 5
}
```

**Backend Query** (add to `event.repository.ts`):

```sql
WITH response_pairs AS (
  -- existing response time logic, grouped by day
)
SELECT
  DATE_TRUNC('day', received_at) as period,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes) as median,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_minutes) as p95
FROM response_pairs
GROUP BY period
ORDER BY period;
```

---

#### 3.2.3 Read Rate Trend (Area Chart)

**Visualization**: Message read rate over time.

```sql
SELECT
  DATE_TRUNC('week', timestamp) as period,
  SUM(CASE WHEN event_name = 'message.sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN event_name = 'message.read' THEN 1 ELSE 0 END) as read_count,
  CAST(SUM(CASE WHEN event_name = 'message.read' THEN 1 ELSE 0 END) AS FLOAT) /
    NULLIF(SUM(CASE WHEN event_name = 'message.sent' THEN 1 ELSE 0 END), 0) as read_rate
FROM events
WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
  AND event_name IN ('message.sent', 'message.read')
GROUP BY period;
```

---

#### 3.2.4 New Contacts Trend (Bar Chart)

**Visualization**: New contacts acquired per period.

```sql
SELECT
  DATE_TRUNC('week', timestamp) as period,
  COUNT(*) as new_contacts
FROM events
WHERE tenant_id = $1
  AND event_name = 'contact.created'
  AND timestamp BETWEEN $2 AND $3
GROUP BY period
ORDER BY period;
```

---

### 3.3 AI Analytics Trends

#### 3.3.1 AI Classification Volume Trend

Track AI usage over time.

#### 3.3.2 AI Accuracy Trend

Track average confidence score over time to monitor model performance.

#### 3.3.3 AI Latency Trend

Track p50 and p95 latency over time to detect degradation.

---

### 3.4 Agent Performance Trends

#### 3.4.1 Chats Resolved per Agent Trend

Track agent productivity over time.

```sql
SELECT
  DATE_TRUNC('week', timestamp) as period,
  properties->>'agentId' as agent_id,
  COUNT(*) as resolved_count
FROM events
WHERE event_name = 'chat.resolved'
  AND timestamp BETWEEN $2 AND $3
GROUP BY period, agent_id
ORDER BY period, resolved_count DESC;
```

#### 3.4.2 Resolution Time Trend by Agent

Compare individual agent response times over time.

---

## 4. Self-Serve vs Assisted Journey Analytics

### 4.1 Concept Definition

| Journey Type   | Definition                              | Tracking Method                                                       |
| :------------- | :-------------------------------------- | :-------------------------------------------------------------------- |
| **Self-Serve** | User completes task without human agent | No `agent.handoff` event OR `InboxSession` remains `unassigned`       |
| **Assisted**   | User requires human agent intervention  | `agent.handoff` event triggered OR `InboxSession` status = `assigned` |

### 4.2 New Event: `agent.handoff`

**Event Schema**:

```json
{
  "eventName": "agent.handoff",
  "properties": {
    "sessionId": "inbox-session-uuid",
    "userId": "whatsapp-phone-number",
    "previousMode": "bot",
    "newMode": "agent",
    "handoffReason": "user_request" | "escalation_rule" | "fallback",
    "journeyStep": "payment_initiated",
    "agentId": "agent-uuid"
  }
}
```

**Trigger Points**:

1. When `InboxSession.status` changes from `unassigned` → `assigned`
2. When bot explicitly transfers to agent
3. When user requests human support

### 4.3 Self-Serve vs Assisted Dashboard Section

#### 4.3.1 Overall Split (Donut Chart)

```
Data Structure:
{
  selfServe: { count: 8500, percent: 72.3 },
  assisted: { count: 3250, percent: 27.7 },
  total: 11750
}
```

#### 4.3.2 Split by Journey/Service (Grouped Bar Chart)

```
Data Structure:
[
  { journey: 'MRI Filing', selfServe: 450, assisted: 120 },
  { journey: 'TOT Filing', selfServe: 380, assisted: 95 },
  { journey: 'NIL Return', selfServe: 520, assisted: 45 },
  { journey: 'Payment', selfServe: 280, assisted: 180 },
]
```

#### 4.3.3 Handoff Rate by Funnel Step (Horizontal Bar)

Shows WHERE users need help most:

```
Data Structure:
[
  { step: 'Payment', handoffRate: 39.1, handoffs: 180 },
  { step: 'OTP Verification', handoffRate: 18.2, handoffs: 95 },
  { step: 'Validation', handoffRate: 12.5, handoffs: 75 },
  { step: 'Form Submission', handoffRate: 8.3, handoffs: 42 },
]
```

#### 4.3.4 Handoff Rate Trend (Line Chart)

Track if self-serve rate is improving over time:

```sql
SELECT
  DATE_TRUNC('week', timestamp) as period,
  COUNT(DISTINCT CASE WHEN event_name = 'agent.handoff' THEN session_id END) as assisted_sessions,
  COUNT(DISTINCT session_id) as total_sessions,
  CAST(COUNT(DISTINCT CASE WHEN event_name = 'agent.handoff' THEN session_id END) AS FLOAT) /
    COUNT(DISTINCT session_id) as handoff_rate
FROM events
WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
GROUP BY period;
```

#### 4.3.5 Assisted Journey Performance

For assisted journeys, show:

- **Avg Resolution Time**: How long does agent take to resolve?
- **First Response Time**: How quickly does agent respond?
- **Handoff → Resolution**: Time from handoff to completion
- **CSAT Score**: (if collected)

### 4.4 Integration with Agent Inbox

The `agent-inbox` page already manages `InboxSession`. We need to:

1. **Fire `agent.handoff` event** when session is accepted
2. **Link event `sessionId`** to `InboxSession.id` for correlation
3. **Add `serviceType` or `journeyStep`** to properties for breakdown

**Code Change** (`inbox.service.ts`):

```typescript
async acceptSession(sessionId: string, agentId: string) {
  const session = await this.inboxSessionRepo.findOne({ where: { id: sessionId } });

  // Update session status
  session.status = 'assigned';
  session.assignedAgentId = agentId;
  await this.inboxSessionRepo.save(session);

  // Fire analytics event
  await this.eventCollector.track({
    eventName: 'agent.handoff',
    userId: session.contactId,
    properties: {
      sessionId: session.id,
      agentId,
      previousMode: 'bot',
      newMode: 'agent',
      channel: 'whatsapp',
    },
  });
}
```

---

## 5. Implementation Architecture

### 5.1 Backend Changes

#### New Service: `TrendsService`

```typescript
// apps/dashboard-api/src/trends/trends.service.ts

@Injectable()
export class TrendsService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  async getSessionTrend(
    tenantId: string,
    granularity: "day" | "week" | "month",
    periods: number,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    return this.sessionRepo.getSessionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );
  }

  async getConversionTrend(
    tenantId: string,
    granularity: "day" | "week" | "month",
    periods: number,
  ) {
    // ...
  }

  async getResponseTimeTrend(
    tenantId: string,
    granularity: "day" | "week" | "month",
    periods: number,
  ) {
    // ...
  }

  async getSelfServeVsAssisted(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // ...
  }
}
```

#### New Controller: `TrendsController`

```typescript
// apps/dashboard-api/src/trends/trends.controller.ts

@Controller('trends')
@UseGuards(JwtAuthGuard)
export class TrendsController {
  constructor(private readonly trendsService: TrendsService) {}

  @Get('sessions')
  async getSessionTrend(
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
    @Query('periods') periods: number = 30,
    @CurrentUser() user: User,
  ) {
    return this.trendsService.getSessionTrend(user.tenantId, granularity, periods);
  }

  @Get('conversion')
  async getConversionTrend(...) { ... }

  @Get('response-time')
  async getResponseTimeTrend(...) { ... }

  @Get('self-serve-assisted')
  async getSelfServeVsAssisted(...) { ... }

  @Get('handoff-by-step')
  async getHandoffByStep(...) { ... }
}
```

### 5.2 Frontend Changes

#### New API Module: `trends-api.ts`

```typescript
// packages/dashboard-ui/lib/trends-api.ts

export const trendsApi = {
  getSessionTrend: (granularity = "day", periods = 30) =>
    fetchWithAuth(
      `/trends/sessions?granularity=${granularity}&periods=${periods}`,
    ),

  getConversionTrend: (granularity = "day", periods = 30) =>
    fetchWithAuth(
      `/trends/conversion?granularity=${granularity}&periods=${periods}`,
    ),

  getResponseTimeTrend: (granularity = "day", periods = 30) =>
    fetchWithAuth(
      `/trends/response-time?granularity=${granularity}&periods=${periods}`,
    ),

  getSelfServeVsAssisted: () => fetchWithAuth("/trends/self-serve-assisted"),

  getHandoffByStep: () => fetchWithAuth("/trends/handoff-by-step"),
};
```

#### Reusable Trend Chart Component

```typescript
// packages/dashboard-ui/components/charts/TrendChart.tsx

interface TrendChartProps {
  data: { period: string; value: number; previousValue?: number }[];
  title: string;
  valueLabel: string;
  showComparison?: boolean;
  targetLine?: number;
  granularity: "day" | "week" | "month";
}

export function TrendChart({
  data,
  title,
  valueLabel,
  showComparison,
  targetLine,
  granularity,
}: TrendChartProps) {
  // Recharts Line/Area chart implementation
}
```

### 5.3 Database Queries (Repository Extensions)

Add to `session.repository.ts`:

```typescript
async getSessionTrend(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month',
) {
  const dateTrunc = `DATE_TRUNC('${granularity}', session.startedAt)`;

  return this.repo
    .createQueryBuilder('session')
    .select(dateTrunc, 'period')
    .addSelect('COUNT(*)', 'count')
    .where('session.tenantId = :tenantId', { tenantId })
    .andWhere('session.startedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
    .groupBy(dateTrunc)
    .orderBy(dateTrunc, 'ASC')
    .getRawMany();
}

async getConversionTrend(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month',
) {
  const dateTrunc = `DATE_TRUNC('${granularity}', session.startedAt)`;

  return this.repo
    .createQueryBuilder('session')
    .select(dateTrunc, 'period')
    .addSelect('COUNT(*)', 'totalSessions')
    .addSelect('SUM(CASE WHEN session.converted THEN 1 ELSE 0 END)', 'conversions')
    .addSelect(
      'CAST(SUM(CASE WHEN session.converted THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)',
      'conversionRate',
    )
    .where('session.tenantId = :tenantId', { tenantId })
    .andWhere('session.startedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
    .groupBy(dateTrunc)
    .orderBy(dateTrunc, 'ASC')
    .getRawMany();
}
```

Add to `event.repository.ts`:

```typescript
async getSelfServeVsAssistedStats(tenantId: string, startDate: Date, endDate: Date) {
  const totalSessions = await this.repo
    .createQueryBuilder('event')
    .select('COUNT(DISTINCT event.sessionId)', 'total')
    .where('event.tenantId = :tenantId', { tenantId })
    .andWhere('event.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
    .getRawOne();

  const assistedSessions = await this.repo
    .createQueryBuilder('event')
    .select('COUNT(DISTINCT event.sessionId)', 'assisted')
    .where('event.tenantId = :tenantId', { tenantId })
    .andWhere('event.eventName = :eventName', { eventName: 'agent.handoff' })
    .andWhere('event.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
    .getRawOne();

  const total = parseInt(totalSessions.total, 10) || 0;
  const assisted = parseInt(assistedSessions.assisted, 10) || 0;
  const selfServe = total - assisted;

  return {
    total,
    assisted,
    selfServe,
    assistedPercent: total > 0 ? (assisted / total) * 100 : 0,
    selfServePercent: total > 0 ? (selfServe / total) * 100 : 0,
  };
}

async getHandoffRateByStep(tenantId: string, startDate: Date, endDate: Date) {
  return this.repo
    .createQueryBuilder('event')
    .select("event.properties->>'journeyStep'", 'step')
    .addSelect('COUNT(*)', 'handoffs')
    .where('event.tenantId = :tenantId', { tenantId })
    .andWhere('event.eventName = :eventName', { eventName: 'agent.handoff' })
    .andWhere('event.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
    .andWhere("event.properties->>'journeyStep' IS NOT NULL")
    .groupBy("event.properties->>'journeyStep'")
    .orderBy('COUNT(*)', 'DESC')
    .getRawMany();
}
```

---

## 6. New Dashboard Pages/Sections

### 6.1 Enhanced Overview Page

Add new section: **Trends**

```
┌──────────────────────────────────────────────────────────────┐
│ TRENDS                                              [day ▼]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Sessions Over Time          │  Conversion Rate Trend       │
│  ┌─────────────────────┐    │  ┌─────────────────────┐     │
│  │    📈 Line Chart     │    │  │    📊 Area Chart     │     │
│  │  +18% vs previous    │    │  │  42.1% → 45.3%       │     │
│  └─────────────────────┘    │  └─────────────────────┘     │
│                              │                              │
│  User Growth                 │  Session Duration Trend      │
│  ┌─────────────────────┐    │  ┌─────────────────────┐     │
│  │  ■ New  ■ Returning │    │  │    📈 Line Chart     │     │
│  │    Stacked Area      │    │  │  Avg: 4m 12s         │     │
│  └─────────────────────┘    │  └─────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 New Page: Self-Serve vs Assisted (`/analytics/journeys`)

```
┌──────────────────────────────────────────────────────────────┐
│ SELF-SERVE VS ASSISTED JOURNEYS                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Self-Serve  │  │  Assisted   │  │ Handoff Rate│          │
│  │   72.3%     │  │   27.7%     │  │   ↓ 2.1%    │          │
│  │  8,500      │  │  3,250      │  │  improving  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  Split by Service               │  Handoff Rate Trend       │
│  ┌─────────────────────────┐   │  ┌─────────────────────┐   │
│  │  ■ Self-Serve ■ Assisted│   │  │    📈 Line Chart     │   │
│  │     Grouped Bar Chart   │   │  │  Goal: < 25%         │   │
│  └─────────────────────────┘   │  └─────────────────────┘   │
│                                                              │
│  Where Users Need Help Most (Handoff by Step)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Payment         ████████████████████████  39.1%     │   │
│  │  OTP             ████████████  18.2%                 │   │
│  │  Validation      ████████  12.5%                     │   │
│  │  Form Submit     █████  8.3%                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Assisted Journey Performance                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Avg Resolve │  │ First Resp  │  │    CSAT     │          │
│  │   8.5 min   │  │   2.1 min   │  │    4.2/5    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Enhanced WhatsApp Analytics Page

Add **Trends Section**:

```
┌──────────────────────────────────────────────────────────────┐
│ MESSAGE TRENDS                                      [week ▼] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Message Volume Trend         │  Response Time Trend        │
│  ┌─────────────────────┐     │  ┌─────────────────────┐    │
│  │ — Received — Sent   │     │  │ — Median  ••• P95   │    │
│  │    Multi-Line       │     │  │ ─ ─ Target (5min)   │    │
│  └─────────────────────┘     │  └─────────────────────┘    │
│                                                              │
│  Read Rate Trend              │  New Contacts Trend         │
│  ┌─────────────────────┐     │  ┌─────────────────────┐    │
│  │    📊 Area Chart    │     │  │    📊 Bar Chart     │    │
│  │  68% → 72% (+4%)    │     │  │  +15% this month    │    │
│  └─────────────────────┘     │  └─────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Prioritized Implementation Roadmap

### Phase 1: Core Trends (1-2 weeks)

| Task                                            | Effort | Priority |
| :---------------------------------------------- | :----- | :------- |
| Create `TrendsService` and `TrendsController`   | 4h     | High     |
| Add `getSessionTrend` to `SessionRepository`    | 2h     | High     |
| Add `getConversionTrend` to `SessionRepository` | 2h     | High     |
| Create reusable `TrendChart` component          | 4h     | High     |
| Add Trends section to Overview page             | 4h     | High     |
| Create `trendsApi` frontend module              | 2h     | High     |

**Deliverable**: Session and Conversion trends on Overview page

---

### Phase 2: WhatsApp Trends (1 week)

| Task                                             | Effort | Priority |
| :----------------------------------------------- | :----- | :------- |
| Add `getMessageVolumeTrend` to `EventRepository` | 2h     | High     |
| Add `getResponseTimeTrend` to `EventRepository`  | 3h     | High     |
| Add `getReadRateTrend` to `EventRepository`      | 2h     | Medium   |
| Add `getNewContactsTrend` to `EventRepository`   | 1h     | Medium   |
| Add Trends section to WhatsApp Analytics page    | 4h     | High     |

**Deliverable**: WhatsApp message and response time trends

---

### Phase 3: Self-Serve vs Assisted (1-2 weeks)

| Task                                            | Effort | Priority |
| :---------------------------------------------- | :----- | :------- |
| Define `agent.handoff` event schema             | 1h     | High     |
| Fire `agent.handoff` event in `InboxService`    | 2h     | High     |
| Add `getSelfServeVsAssistedStats` to repository | 3h     | High     |
| Add `getHandoffRateByStep` to repository        | 2h     | High     |
| Add `getHandoffRateTrend` to repository         | 2h     | Medium   |
| Create `/analytics/journeys` page               | 8h     | High     |
| Add Self-Serve Donut chart                      | 2h     | High     |
| Add Handoff by Step bar chart                   | 2h     | High     |
| Add Handoff Rate Trend chart                    | 2h     | Medium   |

**Deliverable**: New Self-Serve vs Assisted analytics page

---

### Phase 4: Advanced Trends (2+ weeks)

| Task                                       | Effort | Priority |
| :----------------------------------------- | :----- | :------- |
| User Growth trend (new vs returning)       | 4h     | Medium   |
| Session Duration trend                     | 2h     | Low      |
| AI Accuracy/Latency trends                 | 4h     | Medium   |
| Agent Performance trends                   | 4h     | Medium   |
| Period comparison (this week vs last week) | 6h     | Medium   |
| Granularity selector component             | 3h     | Medium   |
| Export trends as CSV/PDF                   | 8h     | Low      |

---

## 8. Technical Considerations

### 8.1 Performance

- **Pre-aggregate daily stats** in a materialized view for fast trend queries
- **Cache trend data** with 5-minute TTL for frequently accessed periods
- **Limit default periods** to 30 days for day granularity, 12 weeks for week

### 8.2 Database Indexes

Add these indexes for trend queries:

```sql
-- For session trends by period
CREATE INDEX idx_sessions_tenant_started_at ON sessions (tenant_id, started_at);

-- For event trends by period
CREATE INDEX idx_events_tenant_timestamp ON events (tenant_id, timestamp);

-- For handoff events specifically
CREATE INDEX idx_events_handoff ON events (tenant_id, event_name, timestamp)
WHERE event_name = 'agent.handoff';
```

### 8.3 Error Handling

Ensure all trend endpoints handle:

- Empty data (no events in period)
- Single data point (can't show trend line)
- Missing granularity/period params (use defaults)

---

## 9. Success Metrics

| Metric                           | Target                |
| :------------------------------- | :-------------------- |
| Trend chart load time            | < 500ms               |
| Self-serve rate visibility       | 100% (currently 0%)   |
| User satisfaction with analytics | Measured via feedback |
| Handoff identification accuracy  | > 95%                 |

---

## 10. Appendix: Chart Library Reference

Using **Recharts** (already installed):

```typescript
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
```

For period comparison:

- Use dual Y-axis or overlaid lines
- Different colors for current vs previous period
- Tooltip showing both values

---

## 11. Related Documents

- [Dashboard Master Reference](../business/dashboard_master_reference.md)
- [Visualization Catalog](../business/visualization_catalog.md)
- [Dashboard Gap Analysis](../business/dashboard_gap_analysis.md)
- [Analytics Strategy](../business/analytics_strategy.md)
- [Agent System Architecture](../architecture/agent_system.md)
