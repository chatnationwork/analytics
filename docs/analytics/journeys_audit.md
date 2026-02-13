# Analytics Audit: Journeys Page

## 1. Page Overview
**Path**: `/journeys`  
**Component**: `journeys/page.tsx`  
**Purpose**: Analyzes the split between Self-Serve (bot/automation) and Assisted (human agent) sessions.

## 2. Metrics & Data Sources

| Metric / Chart | Frontend Component | API Endpoint | Service Method | Repository Method | Data Source Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Sessions** | `StatCard` | `GET /overview` | `getOverview` | `getSelfServeVsAssistedStats` | `COUNT(DISTINCT "sessionId")` from `events` where `sessionId` is not null. |
| **Self-Serve Rate** | `StatCard` | `GET /overview` | `getOverview` | `getSelfServeVsAssistedStats` | `(Total - Assisted) / Total`. **Definition**: Any session *without* an `agent.handoff` event. |
| **Assisted Rate** | `StatCard` | `GET /overview` | `getOverview` | `getSelfServeVsAssistedStats` | `Assisted / Total`. **Definition**: distinct sessions with `eventName = 'agent.handoff'`. |
| **Avg Time to Handoff** | `StatCard` | `GET /time-to-handoff` | `getTimeToHandoff` | `getTimeToHandoff` | `AVG(handoff_time - session_start)`. `session_start` = min timestamp of session. |
| **Session Trend** | `HandoffTrendChart` | `GET /trends/handoff` | `getHandoffTrend` | `getHandoffRateTrend` | Trends of Total vs Assisted vs Self-Serve (calculated as residual) over time. |
| **Handoff by Step** | `HandoffByStepChart` | `GET /handoff-by-step` | `getHandoffByStep` | `getHandoffByStep` | Counts `agent.handoff` events grouped by `properties.journeyStep` (or `handoffReason`/`unknown`). |
| **Journey Breakdown** | `JourneyBreakdownTable` | `GET /by-journey` | `getJourneyBreakdown` | `getJourneyBreakdown` | **Started**: `journeyStart=true`. **Completed**: `journeyEnd=true`. **Dropped Off**: Started - Completed - Assisted. |

## 3. Findings & Issues

### A. Implicit "Self-Serve" Definition
The top-level "Self-Serve Rate" (and the donut chart) defines "Self-Serve" as `Total Sessions - Assisted Sessions`.
*   **Issue**: This counts **abandoned** sessions (where the user left without completing a task OR talking to an agent) as "Self-Serve Success".
*   **Impact**: Inflates the Self-Serve success metric.
*   **Recommendation**:
    *   Refine "Self-Serve" to strictly mean "Resolved by Bot" (requires a `journeyEnd=true` or explicit `bot.resolution` event).
    *   Or, introduce a third category: "Abandoned" (neither resolved nor handed off).

### B. Journey Step Logic
The **Journey Breakdown** table logic is more robust than the top-level stats:
*   It explicitly looks for `journeyStart=true` and `journeyEnd=true` properties.
*   It calculates "Dropped Off" explicitly.
*   **Discrepancy**: The top-level stats don't use this "Completed" definition, leading to a mismatch between the "Self-Serve Rate" (high, includes abandoned) and the detailed "Journey Completion Rate" (likely lower, only explicit completions).

### C. "Time to Handoff" Accuracy
The calculation uses `MIN(timestamp)` of *any* event in the session as the start time.
*   **Assessment**: This is generally correct for "Session Duration until Handoff".
*   **Edge Case**: If a session spans multiple days (long-lived session IDs), this might be skewed, but for chat support, it's likely acceptable.

### D. Data Completeness
*   `getHandoffByStep` relies on `properties.journeyStep` being present on the `agent.handoff` event.
*   **Action**: Ensure the backend/bot logic actually populates `journeyStep` when triggering a handoff. If it's missing, these handoffs will fall into "unknown".

## 4. Proposed Improvements

1.  **Refine "Self-Serve" Metric**:
    *   Split "Self-Serve" into "Completed" (explicit success) and "Incomplete/Abandoned".
    *   Update `getSelfServeVsAssistedStats` to query `journeyEnd=true` events if available, or define a "resolution" event.

2.  **Align Definitions**:
    *   Ensure the "Self-Serve" sessions in the top-level charts align better with the "Completed" sessions in the breakdown table, or clearly label the difference (e.g., "Bot Handled" vs "Bot Resolved").

3.  **Frontend Clarification**:
    *   Rename "Self-Serve" to "Bot Handled" if we keep the current logic (meaning "Agent didn't touch it").
    *   Or add a tooltip explaining "Sessions handled without agent intervention".
