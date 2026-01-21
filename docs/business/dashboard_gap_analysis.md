# Dashboard Gap Analysis & Implementation Plan

## Executive Summary
This document analyzes the gap between the desired CRM Analytics features and the current implementation.

**Key Finding:** The current architecture is **Event-Based (Stateless)**. It is excellent for historical trends, volume, and aggregate metrics. However, it cannot natively support **Real-Time State** requirements (e.g., "Agent Online/Busy", "Live Queue Size") without a "Phase 2" implementation involving a stateful database or redis-backed state machine.

---

## 1. Feature Gap Analysis

### 2.1 Customer Growth & Demographics
| Feature | Status | Feasibility | Notes |
| :--- | :--- | :--- | :--- |
| **Total Reach / Growth Velocity** | ✅ **Exists** | High | Implemented as "New Contacts". |
| **Traffic per Journey** | ✅ **Implemented** | High | Page Paths analysis available in web analytics funnels. |
| **Traffic per Country** | ✅ **Implemented** | High | Added to WhatsApp Analytics dashboard. |
| **Self-serve vs Assisted** | ⏳ **Schema Ready** | Medium | `agent.handoff` event documented. Needs CRM webhook integration. |

### 2.2 Campaign Performance
| Feature | Status | Feasibility | Notes |
| :--- | :--- | :--- | :--- |
| **Sent / Read Rate** | ✅ **Exists** | High | Implemented. |
| **Delivered Rate** | ✅ **Implemented** | High | Added to Message Funnel visualization. |
| **Reply Rate** | ✅ **Implemented** | High | Added to Message Funnel rates. |
| **Funnel View** | ✅ **Implemented** | Medium | Added `MessageFunnel` component showing Sent → Delivered → Read → Replied. |

### 2.3 Operational Efficiency
| Feature | Status | Feasibility | Notes |
| :--- | :--- | :--- | :--- |
| **Response Time** | ✅ **Implemented** | High | Real histogram with median calculation. Replaced mock. |
| **Resolution Volume** | ⚠️ **Partial** | High | "Mark as Done" event needs to be tracked. |
| **Peak Hours** | ✅ **Exists** | High | Implemented as Heatmap. |

### 2.4 Agent Logic (The "Hard" Part)
| Feature | Status | Feasibility | Notes |
| :--- | :--- | :--- | :--- |
| **Agent Status (Online/Busy)** | ❌ **Missing** | **Low** | Requires real-time presence system (WebSockets/Redis). |
| **Live Queue (Open/Unassigned)** | ❌ **Missing** | **Low** | Requires "Conversation State" table (Phase 2). |
| **Assignment Logic** | ❌ **Missing** | **Low** | Requires generic assignment logic implementation. |

---

## 2. Recommendations

### Recommendations for "Self-Serve vs Assisted"
To implement this specific user request:
1.  **Schema Update**: Add `service_mode` ('bot' | 'agent') to the `events` table (or properties).
2.  **Logic**:
    *   Default to `bot` (Self-serve).
    *   Switch to `agent` (Assisted) when a specific "Hand-off" event occurs.
3.  **Metric**: Track the **Hand-off Rate** per journey step (e.g., "50% of users ask for an agent at the 'Payment' step").

### Short Term (Low Hanging Fruit)
These can be implemented immediately with existing data:
1.  **Geographic Map**: Add a map visualization using `country_code` from existing events.
2.  **Real Response Time**: Replace the mock histogram with real SQL queries (time diff between `message_received` and `message_sent`).
3.  **Delivered & Reply Rates**: Add these two metrics to the Stats Grid.
4.  **Message Funnel**: Create a bar chart showing `Sent -> Delivered -> Read -> Replied`.

### Medium Term (Logic Required)
1.  **Campaign Tracking**: Modify `CRM` to send `campaign_id` in message properties. This allows "Campaign ROI" dashboards.
2.  **Conversion Goals**: Define what a "Conversion" is (e.g., "Replied", "Clicked Link") and track it.

### Long Term (Phase 2 Architecture)
To support **Agent Side Reports** (Queues, Status, Assignment), we MUST implement the **Phase 2 Schema** (`conversations` table):
- Track conversation state (`queued`, `open`, `resolved`).
- Track agent presence (`online`, `offline`).
- This requires a significant backend update.

---

## 3. Next Steps
1.  **Approval**: Confirm if we should proceed with "Short Term" fixes.
2.  **Define Phase 2**: Decide if "Agent State" is a priority now or later.
