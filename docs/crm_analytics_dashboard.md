# CRM Analytics & Dashboard Opportunities

This document outlines the data available from the CRM API and how it can be leveraged for analytics dashboards to provide actionable business insights.

---

## 1. Available Data Sources

### 1.1 Contact Data

| Data Point | Source | Analytics Value |
|------------|--------|-----------------|
| WhatsApp Number | Contact API | Unique user identification, geographic insights (country code) |
| Email | Contact API | Cross-channel identity linking |
| Name | Contact API | Personalization metrics |
| Custom Fields | Contact/Custom Field API | Segmentation, lead scoring |
| Created Date | Contact API | Growth tracking, cohort analysis |
| Chat Status | Contact API | Pipeline stage tracking |
| Assigned Operator | Contact API | Team performance metrics |

### 1.2 Campaign Data

| Data Point | Source | Analytics Value |
|------------|--------|-----------------|
| Campaign Name/ID | Campaign API | Campaign grouping |
| Status | Campaign API | Campaign lifecycle tracking |
| Scheduled Date | Campaign API | Send time optimization |
| Total Recipients | Campaign Report | Reach metrics |
| Delivered Count | Campaign Report | Delivery rate calculation |
| Read Count | Campaign Report | Engagement metrics |
| Replied Count | Campaign Report | Response rate, conversion tracking |
| Failed Count | Campaign Report | Deliverability issues |

### 1.3 Message Data

| Data Point | Source | Analytics Value |
|------------|--------|-----------------|
| Message Content | Messages API | Sentiment analysis, keyword tracking |
| Message Type | Messages API | Content format preferences |
| Direction | Messages API | Inbound vs outbound ratio |
| Status | Messages API | Delivery confirmation |
| Timestamp | Messages API | Response time, activity patterns |

---

## 2. Key Metrics & KPIs

### 2.1 Contact & Growth Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    GROWTH DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Total       │  │ New This    │  │ Growth Rate         │  │
│  │ Contacts    │  │ Month       │  │ (MoM %)             │  │
│  │ 12,450      │  │ 1,234       │  │ +15.2%              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Contact Growth Over Time                      │ │
│  │  ▲                                          ••••        │ │
│  │  │                                    ••••••            │ │
│  │  │                              ••••••                  │ │
│  │  │                        ••••••                        │ │
│  │  │                  ••••••                              │ │
│  │  │            ••••••                                    │ │
│  │  └──────────────────────────────────────────────────▶   │ │
│  │    Jan   Feb   Mar   Apr   May   Jun   Jul   Aug        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Metrics:**
- **Total Contacts**: Overall CRM size
- **New Contacts (Daily/Weekly/Monthly)**: Growth velocity
- **Contact Growth Rate**: Period-over-period comparison
- **Churn Rate**: Contacts marked inactive or deleted
- **Source Distribution**: Where contacts are coming from (via custom fields)

### 2.2 Campaign Performance Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                 CAMPAIGN ANALYTICS                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Delivery    │  │ Read        │  │ Reply               │  │
│  │ Rate        │  │ Rate        │  │ Rate                │  │
│  │ 98.2%       │  │ 76.5%       │  │ 12.4%               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  Campaign Comparison                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Campaign           │ Sent  │ Del%  │ Read% │ Reply%   │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ Welcome Series     │ 5,000 │ 99.1% │ 82.3% │ 15.2%    │ │
│  │ Product Launch     │ 3,200 │ 97.8% │ 71.4% │ 8.7%     │ │
│  │ Monthly Newsletter │ 8,500 │ 98.5% │ 68.9% │ 5.3%     │ │
│  │ Re-engagement      │ 1,200 │ 94.2% │ 45.6% │ 22.1%    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Metrics:**
- **Delivery Rate**: (Delivered / Total Sent) × 100
- **Read Rate**: (Read / Delivered) × 100
- **Reply Rate**: (Replied / Delivered) × 100
- **Failure Rate**: (Failed / Total Sent) × 100
- **Campaign ROI**: Revenue attributed / Campaign cost

### 2.3 Engagement & Response Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                  ENGAGEMENT DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│  Response Time Distribution                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  < 1 min  ████████████████████████ 45%                 │ │
│  │  1-5 min  ██████████████ 28%                           │ │
│  │  5-30 min ██████████ 18%                               │ │
│  │  30m-1hr  ███ 5%                                       │ │
│  │  > 1 hr   ██ 4%                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Peak Activity Hours                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      ▄▄                                                │ │
│  │    ▄████▄             ▄▄▄▄                             │ │
│  │   ▄██████▄          ▄██████▄                           │ │
│  │  ▄████████▄        ████████████▄                       │ │
│  │ ▄██████████▄     ▄██████████████▄                      │ │
│  │ ████████████████████████████████████                   │ │
│  │ 6am  9am  12pm  3pm  6pm  9pm  12am                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Metrics:**
- **Average Response Time**: Time between customer message and agent reply
- **First Response Time**: Initial response to new conversations
- **Messages per Conversation**: Conversation length
- **Inbound/Outbound Ratio**: Customer-initiated vs business-initiated
- **Peak Hours**: When users are most active

---

## 3. Dashboard Components

### 3.1 Executive Overview Dashboard

| Widget | Data Source | Purpose |
|--------|-------------|---------|
| Total Contacts KPI | `listContacts()` | Overall CRM health |
| Active Campaigns | `listCampaigns()` | Current marketing activity |
| Monthly Growth Chart | Contact creation dates | Trend visualization |
| Top Campaigns Table | `getCampaignReport()` | Performance ranking |
| Response Rate Gauge | Message timestamps | Team efficiency |

### 3.2 Campaign Analytics Dashboard

| Widget | Data Source | Purpose |
|--------|-------------|---------|
| Campaign Performance Grid | `listCampaigns()` + reports | Compare all campaigns |
| Delivery Funnel | Campaign report metrics | Drop-off analysis |
| Send Time Heatmap | `scheduled_at` + read rates | Optimal timing |
| Template Performance | Template analysis | Content optimization |
| A/B Test Results | Campaign comparisons | Conversion optimization |

### 3.3 Customer Engagement Dashboard

| Widget | Data Source | Purpose |
|--------|-------------|---------|
| Message Volume Chart | `getMessages()` | Activity trends |
| Response Time Histogram | Message timestamps | SLA monitoring |
| Operator Leaderboard | Assignment + completion | Team performance |
| Conversation Status Pie | Chat status | Pipeline overview |
| Keyword Cloud | Message content | Topic discovery |

### 3.4 Segmentation Dashboard

| Widget | Data Source | Purpose |
|--------|-------------|---------|
| Segment Distribution | Custom fields | Audience breakdown |
| Segment Growth | Contact creation + fields | Cohort tracking |
| Segment Engagement | Messages per segment | Target optimization |
| Geographic Distribution | Phone country codes | Regional insights |
| Lead Score Distribution | Custom field scoring | Sales prioritization |

---

## 4. Use Cases & Business Value

### 4.1 Marketing Optimization

```typescript
// Example: Find best send time for campaigns
interface SendTimeAnalysis {
  hour: number;
  averageReadRate: number;
  averageReplyRate: number;
  totalSent: number;
}

// Aggregate campaign data by send hour
const sendTimePerformance: SendTimeAnalysis[] = campaigns
  .filter(c => c.status === 'completed')
  .map(c => ({
    hour: new Date(c.scheduled_at).getHours(),
    ...getCampaignMetrics(c.campaign_id)
  }))
  .groupBy('hour')
  .aggregate();
```

**Insights:**
- Optimal send times for maximum engagement
- Template effectiveness comparison
- Audience segment responsiveness
- Campaign fatigue detection

### 4.2 Sales Pipeline Management

```typescript
// Example: Lead scoring based on engagement
interface LeadScore {
  chatId: string;
  score: number;
  factors: {
    messageCount: number;
    responseRate: number;
    lastActivity: Date;
    customFieldBonus: number;
  };
}

function calculateLeadScore(chatId: string): LeadScore {
  const messages = getMessages(chatId);
  const customFields = getChatCustomFields(chatId);
  
  return {
    chatId,
    score: calculateScoreAlgorithm(messages, customFields),
    factors: extractFactors(messages, customFields)
  };
}
```

**Insights:**
- Hot lead identification
- Follow-up prioritization
- Conversion probability
- Sales rep assignment optimization

### 4.3 Customer Success Monitoring

```typescript
// Example: Identify at-risk customers
interface CustomerHealth {
  chatId: string;
  healthScore: number;
  riskIndicators: string[];
  lastEngagement: Date;
  recommendedAction: string;
}

function identifyAtRiskCustomers(): CustomerHealth[] {
  return contacts
    .filter(c => daysSinceLastMessage(c) > 30)
    .map(c => ({
      chatId: c.chat_id,
      healthScore: calculateHealthScore(c),
      riskIndicators: detectRiskSignals(c),
      recommendedAction: suggestAction(c)
    }));
}
```

**Insights:**
- Churn prediction
- Re-engagement opportunities
- Support escalation needs
- Customer satisfaction trends

### 4.4 Operational Efficiency

```typescript
// Example: Team performance analysis
interface OperatorMetrics {
  email: string;
  chatsAssigned: number;
  chatsResolved: number;
  averageResolutionTime: number;
  customerSatisfaction: number;
}

function getOperatorPerformance(): OperatorMetrics[] {
  return operators.map(op => ({
    email: op.email,
    chatsAssigned: countAssignments(op),
    chatsResolved: countResolutions(op),
    averageResolutionTime: calculateAvgTime(op),
    customerSatisfaction: calculateCSAT(op)
  }));
}
```

**Insights:**
- Agent workload distribution
- Resolution time benchmarks
- Training needs identification
- Capacity planning

---

## 5. Data Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRM DATA PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   CRM API    │───▶│  Data Sync   │───▶│   Analytics DB   │   │
│  │              │    │   Service    │    │   (ClickHouse)   │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│        │                    │                     │              │
│        │                    │                     │              │
│        ▼                    ▼                     ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Webhooks   │    │   Cache      │    │   Dashboard      │   │
│  │  (Real-time) │    │   (Redis)    │    │   (Next.js)      │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1 Sync Strategy

| Data Type | Sync Frequency | Method |
|-----------|----------------|--------|
| Contacts | Every 15 minutes | Incremental (created_at filter) |
| Campaigns | Every 5 minutes | Full refresh (small dataset) |
| Campaign Reports | Hourly | On-demand for active campaigns |
| Messages | Real-time | Webhook + polling fallback |
| Custom Fields | Daily | Full refresh |

### 5.2 Database Schema for Analytics

```sql
-- Contacts dimension table
CREATE TABLE crm_contacts (
  chat_id String,
  whatsapp_number String,
  email Nullable(String),
  name Nullable(String),
  country_code String,
  created_at DateTime,
  updated_at DateTime,
  custom_fields Map(String, String),
  PRIMARY KEY (chat_id)
);

-- Campaign facts table
CREATE TABLE crm_campaign_metrics (
  campaign_id String,
  campaign_name String,
  status String,
  scheduled_at Nullable(DateTime),
  total_recipients UInt32,
  delivered UInt32,
  read UInt32,
  replied UInt32,
  failed UInt32,
  snapshot_at DateTime,
  PRIMARY KEY (campaign_id, snapshot_at)
);

-- Messages facts table
CREATE TABLE crm_messages (
  message_id String,
  chat_id String,
  type String,
  direction String,
  status String,
  content_length UInt32,
  timestamp DateTime,
  PRIMARY KEY (message_id)
);
```

---

## 6. Implementation Roadmap

### Phase 1: Data Foundation (Week 1-2)
- [ ] Set up CRM API sync service
- [ ] Create analytics database tables
- [ ] Implement incremental contact sync
- [ ] Implement campaign report sync

### Phase 2: Core Dashboards (Week 3-4)
- [ ] Executive overview dashboard
- [ ] Campaign performance dashboard
- [ ] Contact growth analytics
- [ ] Basic engagement metrics

### Phase 3: Advanced Analytics (Week 5-6)
- [ ] Response time analytics
- [ ] Operator performance tracking
- [ ] Segmentation dashboards
- [ ] Lead scoring implementation

### Phase 4: Automation & Alerts (Week 7-8)
- [ ] Campaign performance alerts
- [ ] Churn risk notifications
- [ ] Daily/weekly report generation
- [ ] Anomaly detection

---

## 7. API Queries for Dashboard Widgets

### Total Contacts Widget
```typescript
const totalContacts = await crmClient.listContacts({ page: 1, limit: 1 });
const count = totalContacts.pagination.total;
```

### Campaign Performance Summary
```typescript
const campaigns = await crmClient.listCampaigns();
const reports = await Promise.all(
  campaigns.data
    .filter(c => c.status === 'completed')
    .slice(0, 10)
    .map(c => crmClient.getCampaignReport(c.campaign_id))
);

const summary = reports.map(r => ({
  name: r.name,
  deliveryRate: (r.metrics.delivered / r.metrics.total_recipients) * 100,
  readRate: (r.metrics.read / r.metrics.delivered) * 100,
  replyRate: (r.metrics.replied / r.metrics.delivered) * 100,
}));
```

### Recent Activity Feed
```typescript
const recentContacts = await crmClient.listContacts({ limit: 5 });
const activityFeed = await Promise.all(
  recentContacts.data.map(async contact => {
    const messages = await crmClient.getMessages(contact.chat_id, { limit: 1 });
    // Note: Assuming messages API structure based on client types
    const messageContent = messages.data?.messages?.[0]?.content;
    const messageTime = messages.data?.messages?.[0]?.timestamp;
    
    return {
      contact: contact.name || contact.whatsapp_number,
      lastMessage: messageContent ? messageContent.substring(0, 50) : '',
      timestamp: messageTime,
    };
  })
);
```

---

## 8. Conclusion

The CRM API provides rich data that enables:

1. **Customer Insights**: Understanding who your customers are and how they behave
2. **Campaign Optimization**: Data-driven decisions on messaging strategy
3. **Operational Excellence**: Improving team efficiency and response times
4. **Revenue Growth**: Better lead prioritization and conversion tracking

By integrating CRM data into the analytics platform, businesses can create a unified view of customer journeys across WhatsApp and web channels, enabling truly cross-channel analytics.
