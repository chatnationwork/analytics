# Dashboard Missing Features - Quick Wins

> **Purpose**: Features we can add immediately with existing data - no architecture changes needed.

---

## ✅ Have Data, Not Showing It

| Missing Visualization | Where it Should Go | Data Source | Effort |
|:----------------------|:-------------------|:------------|:-------|
| **Average Resolution Time** | WhatsApp stats grid | `chat.resolved.durationMinutes` | Low |
| **Conversation Length Histogram** | WhatsApp Analytics | `chat.resolved.messageCount` | Low |
| **Session Duration Distribution** | Overview page | `sessions.duration` | Low |
| **Error Tracking Dashboard** | New page or Overview | `app_error` events | Medium |
| **Device Type Breakdown** (Donut) | Overview page | `events.deviceType` | Low |
| **Browser Breakdown** | Overview page | `events.browserName` | Low |
| **Entry/Exit Page Analysis** | Sessions page | `sessions.entryPage/exitPage` | Low |
| **Top Pages by Views** | Overview page | `page_view` events by path | Low |
| **Identified vs Anonymous Users** | Overview stats grid | `COUNT WHERE userId IS NOT NULL` | Low |
| **Daily Active Users Chart** | Overview page | Distinct `anonymousId` by day | Low |
| **Real-Time Event Stream** | New "Live" page | Events with polling | Medium |

---

## 🔗 Need Small Backend Changes

| Feature | What's Needed | Effort |
|:--------|:--------------|:-------|
| **Agent-level Performance** | Group metrics by `agentId` | Low |
| **Dropped Chats (Self-serve)** | 30-min inactivity detection | Medium |
| **Escalation Rate** | Count `agent.handoff` events | Low |

---

## ❌ Already Confirmed NOT Possible

These require architecture changes (Phase 2):

- Real-time agent status (Online/Busy)
- Live queue size
- CSAT scores (until collection flow built)
- Open/Unattended chats count

---

## Priority Recommendation

### Batch 1 (Frontend Only)
1. Device Type Donut - Overview
2. Daily Active Users Chart - Overview
3. Session Duration Histogram - Overview
4. Top Pages by Views - Overview
5. Identified vs Anonymous stat card - Overview

### Batch 2 (Simple Queries)
1. Average Resolution Time - WhatsApp
2. Conversation Length Histogram - WhatsApp
3. Entry/Exit Page Analysis - Sessions
4. Error Tracking table - New section

### Batch 3 (More Complex)
1. Real-Time Event Stream
2. Dropped Chat Detection
3. Agent-level breakdown
