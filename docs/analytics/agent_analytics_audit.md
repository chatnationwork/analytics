# Agent Analytics Audit

## Overview
This document outlines the findings from auditing the `Agent Analytics` page (`packages/dashboard-ui/app/(dashboard)/agent-analytics/page.tsx`) and its corresponding backend services (`AgentInboxAnalyticsService` and `EventRepository`).

## Components Analyzed
-   **Frontend**: `agent-analytics/page.tsx`
-   **Backend Controller**: `AgentInboxAnalyticsController`
-   **Backend Service**: `AgentInboxAnalyticsService`
-   **Repository**: `EventRepository`

## Key Findings

### 1. Agent Resolution Rate Calculation (Potential Bug)
In `EventRepository.getAgentDetailedStats`, the `total_chats_handled` is calculated as:
```sql
COALESCE(r.resolved_count, 0) + COALESCE(h.handoffs_received, 0) + COALESCE(ti.transfers_in, 0) as total_chats_handled
```
The Resolution Rate is then calculated in `AgentInboxAnalyticsService` as:
```typescript
resolutionRate: d.totalChatsHandled > 0 
  ? Math.round((d.resolvedCount / d.totalChatsHandled) * 1000) / 10 
  : 0
```
**Issue**: This logic double-counts success. If an agent receives 1 chat and resolves it:
-   `handoffs_received` = 1
-   `resolved_count` = 1
-   `total_chats_handled` = 1 + 1 = 2
-   `resolutionRate` = 1 / 2 = 50%

**Expected**: Resolution Rate should be `Resolved / Assigned`.
-   `Assigned` = `Handoffs Received` + `Transfers In`.
-   Correct Rate = 1 / 1 = 100%.

### 2. Agent Workload Distribution (Incomplete Data)
In `EventRepository.getAgentWorkloadDistribution`, the workload is calculated only based on `agent.handoff` events:
```sql
WHERE "eventName" = 'agent.handoff'
```
**Issue**: This ignores chats transferred **to** an agent (`chat.transferred` where `toAgentId` is the agent). An agent's workload should include both direct handoffs and transfers from other agents/queues.

### 3. Agent Performance Summary (Consistency)
In `EventRepository.getAgentPerformanceSummary`, `resolutionRate` is calculated as:
```javascript
resolutionRate: totalHandoffs > 0 ? (totalResolutions / totalHandoffs) * 100 : 0
```
**Issue**: This uses `totalHandoffs` as the denominator.
-   It ignores `Transfers` (which might be transfers *between* agents, so maybe okay to exclude to avoid double counting system-wide, but generic "Transfers" might included queue transfers).
-   If we treat `agent.handoff` as "New Ticket Assigned to Human", then `Resolutions / Handoffs` is a decent approximation of "System Efficiency" or "Resolution Rate coverage".
-   However, if a chat is transferred 3 times and then resolved, we have:
    -   1 Handoff
    -   3 Transfers
    -   1 Resolution
    -   Rate = 1/1 = 100%. This seems correct for *System* Resolution Rate (did the incoming handoff get resolved?).
    -   But for *Agent* stats (previous point), it needs to be per-agent assigned.

### 4. Frontend "Workload" Display
The "Agent Workload" chart relies on `getAgentWorkloadDistribution`. Since that method misses transfers, the chart is under-reporting workload for agents who primarily receive transfers (e.g., Tier 2 support).

## Proposed Fixes

1.  **Fix `getAgentDetailedStats`**:
    -   Change `total_chats_handled` to `COALESCE(h.handoffs_received, 0) + COALESCE(ti.transfers_in, 0)`.
    -   This represents "Total Incoming Count" (Assigned).
    -   Update `resolutionRate` calculation to use this new definition.

2.  **Fix `getAgentWorkloadDistribution`**:
    -   Update query to include `chat.transferred` (toAgentId) in `agent_chats` along with `agent.handoff`.

3.  **Frontend Updates**:
    -   Ensure the labels reflect these definitions (e.g., "Assigned" instead of "Total" if clearer, though "Total" in the table column is fine if derived correctly).

## API & Data Logic Verified
-   `AgentInboxAnalyticsService.getAgentPerformanceMetrics` uses explicit `inbox_sessions` table queries, which is likely more accurate for "Assigned" counts (`assignedAt` field) than event counting.
-   However, the detailed breakdown lists use `events`. We should align them or acknowledge the source difference.
-   Using `events` is faster for aggregations usually, but we must ensure event emission is reliable.

## Next Steps
-   Update `EventRepository.getAgentDetailedStats`.
-   Update `EventRepository.getAgentWorkloadDistribution`.
