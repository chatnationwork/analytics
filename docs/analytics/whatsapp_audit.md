# WhatsApp Analytics Audit

## Overview
This document outlines the metrics displayed on the **WhatsApp Analytics** page (`/whatsapp-analytics`), their backend data sources, and any findings regarding data accuracy or inconsistencies.

**Page Component:** `packages/dashboard-ui/app/(dashboard)/whatsapp-analytics/page.tsx`
**API Client:** `lib/whatsapp-analytics-api.ts`
**Backend Controller:** `WhatsappAnalyticsController`
**Backend Service:** `WhatsappAnalyticsService`
**Repository:** `EventRepository`

## Metrics & Data Sources

| Metric / Chart | UI Label | Backend Method | Data Source (Events) | Logic / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Messages Received** | Messages Received | `getStats` -> `getWhatsappStats` | `message.received` | Count of all received messages in date range. |
| **Messages Sent** | Messages Sent | `getStats` -> `getWhatsappStats` | `message.sent` | Count of all sent messages in date range. |
| **Read Rate** | Read Rate | `getStats` -> `getWhatsappStats` | `message.read`, `message.sent` | `(Count(message.read) / Count(message.sent)) * 100`. |
| **Unique Contacts** | Unique Contacts | `getStats` -> `getWhatsappStats` | `message.received` | `COUNT(DISTINCT COALESCE(userId, externalId))` from `message.received` events. |
| **New Contacts** | New Contacts | `getStats` -> `getWhatsappStats` | `message.received` | Contacts whose **first ever** `message.received` event occurred within the date range. |
| **Volume Trend** | Message Volume Trend | `getMessageVolumeTrend` | `message.received`, `message.sent` | Grouped by period (day/week/month). Sums of `received` and `sent`. |
| **Response Time Trend** | Response Time Trend | `getResponseTimeTrend` | `message.received`, `message.sent` | Median and P95 of time difference between a `message.received` and the *next* `message.sent`. |
| **Read Rate Trend** | Read Rate Trend | `getReadRateTrend` | `message.read`, `message.sent` | Grouped by period. Ratio of `read` to `sent` counts. |
| **New Contacts Trend** | New Contacts Trend | `getNewContactsTrend` | `contacts` table (via `ContactRepository`) | **Differs from Stat Card**: Uses `ContactRepository.getNewContactsTrend` instead of `EventRepository`. Queries `contacts` table based on `createdAt`? *Needs verification if different from Stat Card.* |
| **Response Time Dist.** | Response Time Distribution | `getResponseTime` | `message.received`, `message.sent` | Histogram buckets (0-1m, 1-2m...) of response times. |
| **Volume by Hour** | Message Volume by Hour | `getVolumeByHour` | `message.received` | **Customer Volume Only**. Counts only `message.received` grouped by hour (0-23). Does not include agent sent messages. |
| **Heatmap** | Activity by Day & Hour | `getHeatmap` | `message.received` | **Customer Activity Only**. Counts `message.received` grouped by Day of Week and Hour. |
| **Funnel** | Message Funnel | `getFunnel` | `message.sent`, `delivered`, `read`, `received` | `Sent` -> `Delivered` -> `Read` -> `Replied` (`received`). |

## Findings & Inconsistencies

### 1. Volume by Hour & Heatmap Scope
The "Message Volume by Hour" and "Activity Heatmap" charts **only count `message.received`** (incoming messages from customers).
- **Implication:** These charts reflect *customer demand*, not total system throughput (which would include agent replies).
- **Recommendation:** Rename UI to "Incoming Volume by Hour" / "Customer Activity Heatmap" for clarity, OR update query to include `message.sent` if total throughput is desired.

### 2. New Contacts Data Source Divergence
- **Stat Card (`getStats`)**: Uses `EventRepository` to find users whose first `message.received` is in the period. Represents **New Active Contacts**.
- **Trend Chart (`getNewContactsTrend`)**: Uses `ContactRepository` (`firstSeen` timestamp). Represents **New Known Contacts**.
- **Impact**: Imported contacts (via CSV) who haven't messaged yet will appear in the Trend chart (if imported recently) but NOT in the Stat Card. This is a valid distinction but may confuse users comparing the two numbers.

### 3. Read Rate Calculation
- **Calculation**: `Box(Read) / Box(Sent)`.
- **Note**: If a message is sent at 11:59 PM on Day 1 and read at 12:01 AM on Day 2, the "Sent" counts for Day 1 and "Read" counts for Day 2. Daily read rates can technically exceed 100% or be lower due to timing, but over aggregation (e.g., 30 days) it averages out.
- **Current Logic**: Simple count division, which is standard for this type of analytics.

### 4. Response Time Logic
- **Logic**: Matches `message.received` to the *next* `message.sent` by the same user.
- **Assumption**: Assumes the next sent message is a "response".
- **Edge Case**: If an agent sends a proactive message after a customer message (without replying to it specifically), it counts as a response. This is generally acceptable for aggregate "responsiveness" metrics.

## Action Items
- [ ] Confirm if "Volume by Hour" / "Heatmap" should remain Customer-only (Demand) or include Agent activity (Throughput). -> *User Investigation*
- [ ] Verify alignment between `ContactRepository` "New Contacts" and `EventRepository` "New Contacts" logic.
