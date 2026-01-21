# CRM System Master Context

> **System Overview**: This document serves as the **Single Source of Truth** for the CRM system architecture, API capabilities, and analytics implementation. It consolidates information from multiple technical and business documents to provide complete context for development and integration.

---

## 1. System Architecture & Context

### 1.1 Context
The CRM system is a core component used to manage customer interactions across multiple channels (primarily WhatsApp). It serves as the foundation for:
1.  **Contact Management**: Storing and segmenting user profiles.
2.  **Campaign Management**: Orchestrating marketing messages.
3.  **Messenger**: Handling real-time 1:1 communication.
4.  **Analytics**: Providing business intelligence on growth and engagement.

### 1.2 Data Flow
*   **Source**: Live CRM API (`https://crm.chatnation.co.ke` / `https://api.yourdomain.com`).
*   **Ingestion**: A Next.js based application consumes this API.
*   **Storage**: Data is synced to local databases (ClickHouse/Redis) for high-performance analytics (future scope).
*   **Visualization**: Dashboards display KPIs derived from this data.

**Related Docs:**
*   [Business Overview](file:///home/saruni/chatnation/analytics/docs/crm_analytics_business_overview.md) - Non-technical value propositions.
*   [Analytics Dashboard](file:///home/saruni/chatnation/analytics/docs/crm_analytics_dashboard.md) - Technical implementation of dashboards.

---

## 2. API Capabilities & Structure

The system interacts with the CRM via a RESTful API.

**Base Configuration:**
*   **URL**: `https://crm.chatnation.co.ke`
*   **Auth**: Header `API-KEY: <token>`

### 2.1 Core Entities & Schemas
*Simplified representations of the data models.*

#### **Contact (`ContactListResponse`)**
Represents a user/chat profile.
```typescript
interface Contact {
  chat_id: string;        // Unique ID
  whatsapp_number: string;
  email?: string;
  name?: string;
  custom_fields?: Record<string, string>;
}

// NOTE: Usage in lists is FLAT.
// Response = { success: true, data: Contact[], pagination: {...} }
```

#### **Campaign (`CampaignListResponse`)**
Represents a marketing blast.
```typescript
interface Campaign {
  campaign_id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  scheduled_at: string | null;
  // Metrics are retrieved separately via getCampaignReport
}

// NOTE: Usage in lists is FLAT.
// Response = { success: true, data: Campaign[], count: number, ... }
```

#### **Campaign Report**
Detailed performance stats.
```typescript
interface CampaignReport {
  campaign_id: string;
  metrics: {
    total_recipients: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
  };
  delivery_rate: string; // e.g. "98%"
}

// NOTE: Response is FLAT.
// Response = { success: true, ...CampaignReport } (No 'data' wrapper)
```

#### **Message**
Individual chat exchanges.
```typescript
interface Message {
  message_id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
}
```

**Related Docs:**
*   [API Documentation](file:///home/saruni/chatnation/analytics/docs/crm_api_documentation.md) - Full endpoint reference.
*   [OpenAPI Spec](file:///home/saruni/chatnation/analytics/docs/crm_api_openapi.yaml) - Formal specification.
*   [Postman Collection](file:///home/saruni/chatnation/analytics/docs/crm_api_postman_collection.json) - Runnable examples.

---

## 3. Key Functionality

### 3.1 Contact Management
*   **List**: Fetch paginated contacts (`GET /crm/chat`).
*   **Search**: Find by email/phone (`GET /crm/chat/search`).
*   **Custom Fields**: Manage attributes like "Segment" or "VIP" (`/crm/setting/custom-field`).

### 3.2 Messaging
*   **History**: Retrieve conversation logs (`GET /crm/chat/:id/messages`).
*   **Assignment**: Route chats to specific agents (`POST .../assign_chat`).
*   **Resolution**: Mark chats as "Done" (`POST .../mark_as_done`).

### 3.3 Campaigns
*   **Create**: Send bulk template messages.
*   **Clone**: Re-run campaigns for new segments.
*   **Report**: Analyze funnel metrics (Sent -> Read -> Replied).

---

## 4. Analytics & KPIs

The system tracks three core pillars of performance.

| Pillar | Key Metrics | Data Source |
| :--- | :--- | :--- |
| **Growth** | Total Contacts, Monthly Growth Rate | `listContacts()` pagination total |
| **Engagement** | Read Rate, Reply Rate | `getCampaignReport()` |
| **Operations** | Response Time, Chats Resolved | `getMessages()` timestamps |

**Dashboard Widgets:**
1.  **Executive View**: Total Contacts, Campaign Active Count.
2.  **Campaign ROI**: Funnel visualization (Delivery % vs Read %).
3.  **Support Health**: Agent Leaderboard & Response Times.

---

## 5. Implementation Details

*   **Client Library**: `libs/crm-api/client.ts` - Fully typed TypeScript wrapper.
*   **Type Definitions**: `libs/crm-api/types.ts` - Syncs with the schemas above.
*   **Testing**:
    *   Unit Tests: `libs/crm-api/client.spec.ts`
    *   Integration Tests: `libs/crm-api/integration.spec.ts` (Verified against live API).

> **Important Implementation Note**: The live API uses a **FLAT** structure for many responses (unlike the initial nested design). Always refer to `types.ts` or the [Integration Test](file:///home/saruni/chatnation/analytics/libs/crm-api/integration.spec.ts) observations for the ground truth of data shapes.
