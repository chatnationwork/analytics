# KRA Analytics Reports - Feasibility Assessment

> **Architecture**: Event-based analytics (stateless). No real-time state or agent presence system.

---

## Summary

| Report | Status | Notes |
|:-------|:------:|:------|
| Report 1: Service Channel Performance | ⚠️ Partial | Requires `service_mode` tracking (schema ready, CRM integration pending) |
| Report 1B: Service-Level Performance | ⚠️ Partial | Requires `service_name` on events |
| Traffic per Country | ✅ **Ready** | `country_code` exists, UI implemented |
| Report 2: CSAT & QA Investigation | ❌ **Not Ready** | Requires CSAT collection + feedback storage |
| Report 3: Conversation Lifecycle | ❌ **Not Ready** | Requires real-time state (open/queued/unattended) |
| Report 4: Agent Availability | ❌ **Not Ready** | Requires presence system + workload tracking |
| Report 5: Agent Productivity | ⚠️ Partial | Response time ✅, needs agent-level grouping |
| Report 6: Platform Traffic & Queue | ⚠️ Partial | Traffic ✅, Queue metrics require state |
| Report 7: Drop-Off Conversations | ⚠️ Partial | Requires `drop_off_reason` classification |

---

## Detailed Breakdown

### ✅ Can Do Now

| Metric | Source | Status |
|:-------|:-------|:------:|
| `country` | `country_code` field | ✅ Implemented |
| `total_chats` / `started_chats` | `message.received` count | ✅ |
| `resolved_chats` | `chat.resolved` event | ✅ |
| `avg_first_response_sec` | Time diff: `message.received` → `message.sent` | ✅ Implemented |
| `avg_resolution_time_min` | Time diff: first message → `chat.resolved` | ✅ Feasible |
| Traffic by hour/day | Event timestamps | ✅ Implemented (Heatmap) |
| Message Funnel | Sent → Delivered → Read → Replied | ✅ Implemented |

---

### ⚠️ Can Do With Small Changes

| Metric | Requirement | Effort |
|:-------|:------------|:------:|
| `service_type` (Self-Serve/Assisted) | `agent.handoff` event from CRM | Low |
| `service_name` (eTIMS, PIN, TCC) | Add `service_name` to event properties | Low |
| `dropped_chats` | Define inactivity timeout logic | Medium |
| `drop_off_rate_pct` | Depends on `dropped_chats` | Medium |
| `escalation_rate_pct` | Count `agent.handoff` events | Low |
| Agent-level metrics | Ensure `agentId` on all events | Low |

---

### ❌ Cannot Do (Requires Architecture Change)

| Metric | Why | Required Change |
|:-------|:----|:----------------|
| `open_chats` (real-time) | Stateless architecture | Conversations table or presence system |
| `queued_chats` | No queue state | Queue integration |
| `unattended_chats` | No live tracking | Presence system |
| `agent_status` (Online/Busy/Offline) | No presence | WebSocket/Redis presence |
| `workload_state` | No real-time tracking | Agent workload service |
| `csat_avg` | CSAT not collected | CSAT collection flow |
| `feedback_text` | Comments not stored | Feedback table |
| `qa_status` | No QA workflow | QA review table + UI |

---

## Recommended Phased Approach

### Phase 1: Quick Wins (Current Sprint)
- ✅ Traffic per Country  
- ✅ Response Time Histogram  
- ✅ Message Funnel (Delivered/Reply Rates)  
- ✅ Traffic by Journey  

### Phase 2: Event Enrichment (1-2 weeks)
- Add `service_name` to CRM events  
- Implement `agent.handoff` event  
- Add `drop_off_reason` classification  
- Enable Service Channel Performance report  

### Phase 3: Stateful Architecture (4-6 weeks)
- Add `conversations` table  
- Implement real-time queue/status tracking  
- Build CSAT collection flow  
- Enable Agent Workload & Lifecycle reports  

---

## Data Sources Required per Report

| Report | Events Needed | Tables Needed |
|:-------|:--------------|:--------------|
| 1. Service Channel | `message.*`, `agent.handoff`, `chat.resolved` | `events` |
| 1B. Service-Level | Same + `service_name` property | `events` |
| 2. CSAT | `csat.submitted` | `csat_responses` (new) |
| 3. Lifecycle | `chat.opened`, `chat.assigned`, `chat.resolved` | `conversations` (new) |
| 4. Agent Availability | Agent presence events | `agent_status` (new) |
| 5. Agent Productivity | `message.sent` + `agentId` | `events` |
| 6. Platform Traffic | All events | `events` |
| 7. Drop-Offs | `chat.dropped` or timeout logic | `events` |
