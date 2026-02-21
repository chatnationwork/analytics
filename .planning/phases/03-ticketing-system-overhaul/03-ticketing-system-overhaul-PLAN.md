# Phase Plan: Ticketing System Overhaul

## Goal
Comprehensive update to the EOS ticketing system, including editing ticket capacity, resending tickets via WhatsApp, and location-based check-ins.

## 1. Research & Preparation
- [ ] Verify existing entities: `EosTicket`, `EosTicketType`.
- [ ] Check `EosTicketController` and `EosTicketService` for current implementation.
- [ ] Analyze `TicketTypeManager.tsx` and `TicketManager.tsx` for UI changes.

## 2. Implementation Strategy

### Wave 1: Database & Entities (Core Backend)
- **Task 2.1: [NEW] `EosLocation` Entity**
  - Define `EosLocation` for entry point management (id, name, description, eventId).
- **Task 2.2: [NEW] `EosScanLog` Entity**
  - Define `EosScanLog` for tracking check-in history (ticketId, locationId, timestamp, status).
- **Task 2.3: [MODIFY] `EosTicketType` Entity**
  - Add `accessLocations` (relation or ID array) to define valid entry points.
  - Ensure `quantityTotal` is updatable.

### Wave 2: Backend Logic & Controllers
- **Task 2.4: [MODIFY] `EosTicketService`**
  - Implement `resendTicket(ticketId)` to trigger WhatsApp fulfillment messages.
  - Implement `manualIssueTicket(data)` for VIPs and late onboarders.
  - Update `checkIn(ticketId, locationId)` to support multiple locations and record `EosScanLog`.
- **Task 2.5: [MODIFY] `EosTicketController`**
  - Add `POST /:id/resend` endpoint.
  - Add `POST /manual-issue` endpoint.
  - Add `GET /scan-logs` and `GET /locations` endpoints.

### Wave 3: Dashboard UI (Core Features)
- **Task 2.6: [MODIFY] `TicketTypeManager.tsx`**
  - Feature: Allow editing `quantityTotal` for existing ticket types.
- **Task 2.7: [MODIFY] `TicketManager.tsx`**
  - Feature: Add "Resend WhatsApp" button for all valid tickets.
- **Task 2.8: [MODIFY] `page.tsx` (Event Tickets Page)**
  - Implement tabbed layout: Locations, Tickets, Pending Tickets, Scan Logs, Analytics.

### Wave 4: Dashboard UI (New Modules)
- **Task 2.9: [NEW] `LocationManager.tsx`**
  - Manage locations/entry points for an event.
- **Task 2.10: [NEW] `ScanLogViewer.tsx`**
  - Filterable scan logs with export functionality.
- **Task 2.11: [NEW] `TicketingAnalytics.tsx`**
  - Sales and scan charts.

## 3. Verification Strategy

### Automated Tests
- [ ] Unit tests for `EosTicketService` (capacity updates, check-in validation).
- [ ] Integration tests for location-restricted scanning.

### Manual Verification
- [ ] Increase capacity for a sold-out ticket and verify purchase is possible.
- [ ] Resend a ticket via WhatsApp and verify delivery.
- [ ] Test location-restricted scanning (attempt check-in at invalid location).

## 4. Final Review
- [ ] Verify all new entities are correctly migrated.
- [ ] Ensure UI is responsive and handles error states for resending.
