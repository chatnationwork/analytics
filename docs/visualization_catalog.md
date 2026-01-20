# Dashboard Visualization Catalog

> **Purpose:** Document all chart types available based on the data we collect. This serves as a reference for dashboard development and the public showcase page.

---

## 1. Data We Collect

Before defining visualizations, here's what data is available:

| Data Category | Fields | Source |
|---------------|--------|--------|
| **Events** | name, timestamp, properties, userId, sessionId | SDK/API |
| **Sessions** | duration, eventCount, entryPage, exitPage, converted | Aggregated |
| **Users** | traits (email, phone, name), firstSeen, lastSeen | Identify calls |
| **Pages** | path, title, views, avgTimeOnPage | Page events |
| **Funnel Steps** | step name, count, dropoff | Configured funnels |
| **WhatsApp** | messages, responseTime, readRate, agentId | Webhooks |
| **Geo/Device** | country, city, deviceType, browser, OS | Enrichment |

---

## 2. Chart Types by Story

### 2.1 Metrics at a Glance

| Chart Type | Best For | Example |
|------------|----------|---------|
| **Stat Card** | Single KPI with trend | Total Users: 12,500 ↑12% |
| **Sparkline** | Trend without detail | Mini line in stat card |
| **Comparison Card** | Period-over-period | This week vs last week |

**Use When:** Executive overview, quick health check

---

### 2.2 Trends Over Time

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Line Chart** | Continuous trends | Timestamp + metric |
| **Area Chart** | Cumulative growth | Timestamp + stacked values |
| **Step Chart** | Discrete changes | State changes over time |
| **Multi-Line** | Comparing segments | Multiple series |

**Stories We Can Tell:**
- Daily active users over last 30 days
- Session count by hour (peak hours)
- Message volume trend (WhatsApp)
- Response time improvement over weeks

---

### 2.3 Funnels & Conversion

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Horizontal Bar Funnel** | Drop-off visualization | Step counts |
| **Sankey Diagram** | Flow between states | From → To counts |
| **Stacked Waterfall** | Cumulative loss | Step-by-step drops |

**Stories We Can Tell:**
- Where users drop off in signup flow
- Campaign → Read → Reply conversion
- Tax filing journey completion rate

---

### 2.4 Distribution & Composition

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Pie/Donut Chart** | Part of whole (2-6 segments) | Category counts |
| **Treemap** | Hierarchical composition | Nested categories |
| **Stacked Bar** | Composition over time | Categories per period |

**Stories We Can Tell:**
- Traffic by device type (Desktop 45%, Mobile 52%, Tablet 3%)
- Users by country
- Message types (text, media, template)

---

### 2.5 Ranking & Comparison

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Horizontal Bar** | Ranking items | Category + value |
| **Lollipop Chart** | Cleaner ranking | Category + value |
| **Grouped Bar** | Comparing groups | Multiple categories |

**Stories We Can Tell:**
- Top 10 pages by views
- Agent performance ranking
- Most used features
- Campaign performance comparison

---

### 2.6 Time-Based Patterns

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Heatmap (Hour × Day)** | Activity patterns | Timestamp aggregates |
| **Calendar Heatmap** | Daily intensity | Date + count |
| **Radial Chart** | Cyclical patterns | Hour of day data |

**Stories We Can Tell:**
- When do users engage most? (Peak Hours)
- Best time to send WhatsApp campaigns
- Weekly activity patterns

---

### 2.7 User Journeys & Flows

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Event Timeline** | Individual user journey | Ordered events |
| **Sankey Flow** | Aggregate path analysis | Page transitions |
| **Node Graph** | Complex relationships | Connections |

**Stories We Can Tell:**
- Complete journey of a single user
- How users navigate between pages
- Where do users go after the home page?

---

### 2.8 Performance & SLA

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Gauge** | Current vs target | Single metric |
| **Bullet Chart** | Progress to goal | Actual vs target |
| **Histogram** | Distribution | Binned values |
| **Box Plot** | Spread analysis | Min/max/quartiles |

**Stories We Can Tell:**
- Response time SLA (target: < 5 min)
- Conversion rate vs goal
- Session duration distribution

---

### 2.9 Geographic

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Choropleth Map** | Country comparison | Country code + value |
| **Dot Map** | City-level detail | Lat/long + value |
| **Region Table** | Detailed breakdown | Country + metrics |

**Stories We Can Tell:**
- Where are your users located?
- Regional engagement differences
- International expansion opportunities

---

### 2.10 Tables & Lists

| Chart Type | Best For | Data Required |
|------------|----------|---------------|
| **Data Table** | Detailed exploration | Any structured data |
| **Leaderboard** | Top N items | Ranked data |
| **Activity Feed** | Real-time stream | Timestamped events |

**Stories We Can Tell:**
- Recent sessions with details
- Top users by engagement
- Live event stream

---

## 3. Visualization Matrix

| Story to Tell | Primary Chart | Secondary Chart |
|---------------|---------------|-----------------|
| Growth | Line Chart | Stat Card |
| Conversion | Funnel | Sankey |
| Engagement | Heatmap | Bar Chart |
| Performance | Gauge | Histogram |
| Composition | Donut | Treemap |
| Ranking | Horizontal Bar | Table |
| Geography | Map | Region Table |
| Real-time | Activity Feed | Stat Cards |
| User Journey | Timeline | Sankey |
| Agent Performance | Leaderboard | Box Plot |

---

## 4. Dashboard Page Structure

### Overview Page
- Stat cards: Sessions, Users, Conversion Rate, Avg Duration
- Line chart: Daily active users
- Donut: Traffic by device
- Heatmap: Activity by hour

### Funnel Page
- Horizontal bar funnel: Configurable steps
- Comparison: This period vs previous
- Breakdown by segment

### Sessions Page
- Table: Session list with filters
- Timeline: Selected session events

### WhatsApp Analytics
- Stat cards: Messages, Response Time, Read Rate
- Line: Message volume trend
- Heatmap: Peak hours
- Leaderboard: Agent performance
- Funnel: Campaign delivery

### User Explorer
- Search by ID/email/phone
- Timeline: Full user journey
- Stat summary: Sessions, events, conversion

---

## 5. WhatsApp-Specific Visualizations

Based on the data from WhatsApp events (see [analytics_strategy_pivot.md](./analytics_strategy_pivot.md)):

| Metric | Chart Type | Data Source |
|--------|------------|-------------|
| **Response Time** | Gauge + Histogram | Time between `message.received` and `message.sent` |
| **Daily Contacts** | Area Chart | Count `contact.created` by day |
| **Read Rate** | Donut | `message.read` / `message.sent` |
| **Peak Hours** | Heatmap (hour × day) | `message.received` timestamps |
| **Agent Leaderboard** | Horizontal Bar | Events grouped by `agentId` |
| **Campaign Funnel** | Funnel Chart | `campaign.sent` → delivered → read → replied |
| **Conversation Length** | Histogram | `messageCount` from `chat.resolved` |
| **Resolution Time** | Box Plot | `durationMinutes` from `chat.resolved` |

### WhatsApp User Journey Timeline

```
+254712345678 (John Doe)
│
├── 🟢 10:00 AM - contact.created
│   └── source: "organic", country: "KE"
│
├── 📥 10:01 AM - message.received
│   └── contentType: "text", chatId: "chat_123"
│
├── 👤 10:02 AM - chat.assigned
│   └── agentId: "agent_456"
│
├── 📤 10:05 AM - message.sent
│   └── templateId: "welcome_v2", agentId: "agent_456"
│
├── 👁️ 10:06 AM - message.read
│
├── 📥 10:08 AM - message.received
│   └── contentType: "text"
│
├── 📤 10:10 AM - message.sent
│
└── ✅ 10:30 AM - chat.resolved
    └── messageCount: 6, durationMinutes: 30
```

---

## 6. Chart Library Recommendation

For the dashboard, use **Recharts** (already in use):
- Line, Area, Bar, Pie, Funnel charts ✅
- Composable and React-native ✅
- Responsive out of box ✅

For advanced charts, consider adding:
- **nivo** for heatmaps, treemaps, Sankey
- **visx** for custom D3-based charts
- **react-simple-maps** for geographic

---

## 7. Accessibility Guidelines

| Requirement | Implementation |
|-------------|----------------|
| Color blindness | Use patterns + colors |
| Screen readers | Add chart descriptions |
| Keyboard nav | Focus states on interactive elements |
| Dark mode | Test all charts in both themes |
