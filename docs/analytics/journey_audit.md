# User Journey Page Audit
**Page**: `packages/dashboard-ui/app/(dashboard)/journey/page.tsx`

## Current State
The page allows searching for a user (by ID, phone, email, or anonymous ID) and displays a chronological list of events associated with them.

### Data Sources
- **API**: `GET /api/dashboard/sessions/journey/:id`
- **Backend**: `SessionsService.getUserJourney`
- **Data Returned**:
  - `user`: Aggregated stats (total sessions, events, first/last seen).
  - `sessions`: Array of session objects (start, end, duration, device, etc.).
  - `events`: Array of raw events (page_view, message, etc.).

### Findings
1.  **Data Integrity**: The backend returns correct and comprehensive data, including distinct sessions and granular events.
2.  **Visualization Issue**: The frontend **ignores the `sessions` array** and groups events solely by calendar date. This obscures the concept of a "visit" or "support session".
3.  **Visual Noise**: The flat list of events makes it hard to distinguish between meaningful interactions (messages, conversions) and passive events (page views).
4.  **UX**:
    -   Search is functional but basic.
    -   No visual distinction for "Session Start" or "Session End".
    -   Hard to see if a session resulted in a "Conversion" or "Handoff".
5.  **Journey Context**: The recently added `journey` logic (from the previous task) is not explicitly highlighted here (e.g., filtering by journey type).

## Proposed Enhancements

### 1. Session-Based Grouping
Instead of grouping by Date, group events by **Session**.
- **Session Header**: Display Start Time, Duration, Device, Entry Page, and Status (Active/Ended/Converted).
- **Collapsible**: Allow collapsing older sessions to focus on recent ones.

### 2. Enhanced Timeline UI
- **Icons**: Use distinct icons for different event types (Chat vs Navigation vs System).
- **Highlighting**: Highlight critical events like `hand_off`, `conversion`, `error`.
- **Connectors**: Better visual cues connecting events within a session.

### 3. User Profile Card
Improve the top user card to show:
-   **Segments/Tags**: If available (e.g., "Returning User", "Mobile User").
-   **Last Active**: Relative time (e.g., "2 hours ago").

### 4. Event Filtering
Add a simple filter toggle:
-   [x] Show Page Views
-   [x] Show System Events
(Default to hiding noisy events if the list is long).
