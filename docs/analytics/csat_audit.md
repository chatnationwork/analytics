# CSAT Analytics Audit

## Current State
- **Page**: `/csat-analytics`
- **Data Source**: `CsatAnalyticsService` -> `EventRepository`
- **Metrics Available**:
  - Total Sent (`csat.sent` count)
  - Avg CSAT Score (avg of `properties.rating` in `csat_submitted`)
  - Total Responses (`csat_submitted` count)
  - 5-Star %
  - Score Distribution (1-5 stars)
  - Recent Feedback (List)
  - CSAT per Journey (Table)

## Missing Features ("Trends and all")
1.  **Visual Trends**: The page currently only shows a single "Trend" number (+/- X%). It lacks a proper **Line/Bar Chart** showing how CSAT score changes over time (Daily/Weekly).
2.  **Response Rate**: We have "Total Sent" and "Total Responses" but don't explicitly calculate or visualize the **Response Rate %** (`Responses / Sent`).
3.  **Response Volume Trend**: No visual indication of whether we are getting *more* or *fewer* responses over time.

## Proposed Enhancements

### 1. Backend Changes (`apps/dashboard-api`)
- **`EventRepository`**: Add `getCsatTrend(tenantId, startDate, endDate, granularity)`
  - Query `csat_submitted` grouped by time period.
  - Return: `period`, `averageScore`, `responseCount`.
  - *Optional*: Join with `csat.sent` to get `sentCount` for response rate trend? (might be complex to join loosely coupled events, maybe just 2 separate queries).
- **`CsatAnalyticsService`**: Expose `getCsatTrend`.

### 2. Frontend Changes (`packages/dashboard-ui`)
- **New Chart**: **CSAT Trend** (Line Chart)
  - X-Axis: Time (Day/Week)
  - Y-Axis (Left): Average Score (1-5)
  - Y-Axis (Right - optional): Response Volume (Bar)
- **New Metric**: **Response Rate**
  - Add specific Stat Card for `(Responses / Sent) * 100` %.
- **Refinement**:
  - Move "Total Sent" and "Response Rate" next to each other.

## Schema Check
- `events` table has `timestamp`, `eventType`, `properties`.
- `csat.sent` event exists.
- `csat_submitted` event exists with `properties.rating`.
- Data is available for all proposed features.
