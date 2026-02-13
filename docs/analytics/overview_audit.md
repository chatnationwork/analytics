# Analytics Audit: Overview Page

## 1. Top Level KPIs (OverviewService.getOverview)
- **Total Sessions**: `COUNT(*)` from `sessions` table.
  - **Source**: `SessionRepository.getOverviewStats`
  - **Notes**: Simple count of all sessions in the period.
- **Unique Users**: `COUNT(DISTINCT userId)` from `sessions` table.
  - **Source**: `SessionRepository.getOverviewStats`
  - **Notes**: **Potential Issue**: This metric only counts identified users (where `userId` is not null). Anonymous users are successfully excluded. If the intent is to show "Total Visitors", this is undercounting. If the intent is "Logged-in Users", it is correct but the label "Total Users" might be misleading.
- **Conversion Rate**: `SUM(converted)/COUNT(*)` from `sessions`.
  - **Source**: `SessionRepository.getOverviewStats`
  - **Notes**: Calculated based on the `converted` boolean flag on the session entity.
- **Avg Session Duration**: `AVG(durationSeconds)` from `sessions`.
  - **Source**: `SessionRepository.getOverviewStats`
  - **Notes**: Simple average of session duration.

## 2. Trends Charts (TrendsService)
- **Session Trend**: `COUNT(*)` from `sessions` grouped by period.
  - **Source**: `SessionRepository.getSessionTrend`
- **Conversion Trend**: `SUM(converted)/COUNT(*)` from `sessions` grouped by period.
  - **Source**: `SessionRepository.getConversionTrend`
- **User Growth Trend**:
  - **Source**: `SessionRepository.getUserGrowthTrend`
  - **Logic**: Complex query using `user_first_session` CTE.
  - **New Users**: Count of `anonymousId` whose first session in the `sessions` table started in the period.
  - **Returning Users**: Total users in period minus New users.
  - **Notes**: Relies on `anonymousId` for tracking. Dependable as long as cookies/local storage persist.
- **Session Duration Trend**: `AVG(durationSeconds)` from `sessions` grouped by period.
  - **Source**: `SessionRepository.getSessionDurationTrend`
  - **Notes**: Excludes sessions with 0 duration.
- **Daily Active Users (DAU)**: `COUNT(DISTINCT anonymousId)` from `events` grouped by day.
  - **Source**: `EventRepository.getDailyActiveUsers`
  - **Notes**: Uses `anonymousId` from `events` table. This captures all activity (any event), not just session starts. This is a good metric for "Active Users".

## 3. Breakdowns
- **Traffic by Device**: `COUNT(*)` from `sessions` grouped by `deviceType`.
  - **Source**: `SessionRepository.getDeviceBreakdown`
  - **Notes**: Uses the denormalized `deviceType` column on the `SessionEntity`.
- **Top Browsers**: `COUNT(DISTINCT sessionId)` from `events` grouped by `browserName`.
  - **Source**: `EventRepository.getBrowserBreakdown`
  - **Notes**: **Inconsistency**: Uses `events` table and counts distinct sessions, whereas Device breakdown uses `sessions` table directly. This implies `browserName` might not be stored on `SessionEntity` or the implementation chose a different path.
- **Traffic by Journey (Page Paths)**: `COUNT(*)` from `events` where `eventName='page_view'` grouped by `pagePath`.
  - **Source**: `EventRepository.getTopPagePaths`
  - **Metrics**: Returns both total `count` (page views) and `uniqueSessions` (unique visits to that page).
- **Identify vs Anonymous**:
  - **Source**: `EventRepository.getIdentifiedVsAnonymous`
  - **Total**: `COUNT(DISTINCT anonymousId)`
  - **Identified**: `COUNT(DISTINCT anonymousId)` where `userId` is not null.
  - **Anonymous**: Total - Identified.
  - **Notes**: Provides the context missing from the main "Unique Users" KPI.
- **Activity Heatmap**: `COUNT(*)` from `sessions` grouped by Day of Week and Hour.
  - **Source**: `SessionRepository.getActivityHeatmap`

## 4. WhatsApp Analytics (WhatsappAnalyticsService)
- **Source**: `EventRepository` and `ContactRepository`.
- **Metrics**: 
  - **Volume**: Counts `message.sent` and `message.received`.
  - **Resolution Time**: Calculated from time between `message.received` and `message.sent`.
  - **Funnel**: Sent -> Delivered -> Read -> Replied.
  - **New Contacts**: Users whose first `message.received` event is within the period.

## 5. Potential Issues / Recommendations
1.  **"Unique Users" KPI Definition**: The main dashboard "Unique Users" card only counts `userId` (identified users). This should likely be renamed to "Identified Users" or updated to count `anonymousId` if "Total Visitors" is the desired metric.
2.  **Data Source Consistency**: Device breakdown uses `sessions` table, Browser breakdown uses `events` table. While likely not a bug, using `sessions` table is generally more performant for high-level aggregations if the data is available. Recommendation: Check if `browserName` can/should be added to `SessionEntity` for consistency and performance.
3.  **Cross-Subdomain Tracking**: Reliance on `anonymousId` persistence means clearing cookies resets "New User" status and creates a new "User". This is standard for cookie-based analytics but worth noting.
