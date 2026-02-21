# EOS & Campaign Module Integration Checklist

This document serves as the integration audit between the `eos-events` module and the `campaigns` delivery engine. It verifies that EOS can successfully dispatch single triggers, bulk broadcasts, and handle the full attendee lifecycle without dropping payloads.

## 1. The Single Message Send (The "Hello World")
*Goal: Successfully send a single WhatsApp invite or ticket delivery via event triggers.*

### Trigger Service Handoff
- [ ] **Payload Construction:** Ensure the EOS module correctly formats the payload (e.g., `contactId`, `eventId`, `templateVariables`) before calling `TriggerService.fire(trigger, payload)`.
- [ ] **Campaign Type Validation:** Verify that the trigger is mapping to an active campaign of type `module_initiated`.
- [ ] **Opt-in Check:** Confirm that `TriggerService` correctly validates the user's opt-in status before proceeding to orchestration.

### Orchestration & Queueing
- [ ] **Database Tracking:** Check that `CampaignOrchestratorService.executeForContact` creates a new row in the `campaign_messages` table with a `pending` status.
- [ ] **BullMQ Enqueueing:** Verify the job is successfully pushed to the `SendWorker` queue.
- [ ] **Worker Execution:** Confirm the worker successfully calls the low-level `WhatsappService.sendMessage()` and updates the DB status to `sent`.

---

## 2. The Bulk Campaign Send (The Launch Phase)
*Goal: Dispatch bulk event invites to a filtered list of contacts without hitting WhatsApp API rate limits or crashing the worker.*

### Audience & Orchestration
- [ ] **Filter DSL Execution:** Ensure the audience filter builder correctly queries the database for the targeted segment (e.g., "Users tagged 'tech-enthusiast' in Ngong").
- [ ] **Batch Processing:** Verify that `CampaignOrchestratorService` batches the target list and creates `campaign_messages` records efficiently to avoid memory leaks.

### Rate Limiting & Safety
- [ ] **WhatsApp Tier Limits:** Ensure the BullMQ worker respects the tenant's current 24h conversation window limit (e.g., 1,000 limits for Tier 1).
- [ ] **Staggered Sending:** Confirm that bulk sends are staggered (e.g., using BullMQ's delay/concurrency settings) to prevent burst-rate blocking from Meta.
- [ ] **Quota Dashboard:** Check that the frontend UI (`Broadcast UI`) accurately previews the estimated recipient count and quota impact before launch.

---

## 3. The EOS User Journey Gauntlet
*Goal: Ensure all post-invite micro-interactions from the `eos_events-crm-user-journeys` flow are wired to the Campaign engine.*

### Pre-Event & Ticketing
- [ ] **Ticket Generation (`/tickets/generate`):** Does generating a ticket fire a WhatsApp trigger with the user's unique QR code?
- [ ] **HypeCard Delivery (`/tickets/:id/hypecard`):** Once the background worker generates the customized HypeCard image, does it trigger a rich-media WhatsApp template via the Campaign module?
- [ ] **Tier Routing:** Are Platinum/Gold users receiving their specific, tier-gated messaging (e.g., reserved seating confirmations) seamlessly?

### During Event (Exhibitor OS)
- [ ] **Attendance Validation (`/attendance/validate`):** Does a scanner pinging this endpoint trigger an instant "Welcome to the event" WhatsApp message?
- [ ] **Lead Capture (`/leads/capture`):** When an Exhibitor scans a badge, does the system immediately fire a "Thank you for visiting Booth X" message to the lead?
- [ ] **Live Polling (`/polls/:id/send`):** Can an exhibitor push a quick survey trigger specifically to the isolated list of leads they have captured?

---

## 4. Error Handling & Resiliency
*Goal: Ensure the system self-heals when things go wrong.*

- [ ] **BullMQ Retries:** Are failed sends (e.g., temporary network drops) configured with exponential backoff?
- [ ] **Invalid Numbers:** If a contact's WhatsApp number is invalid, does the system immediately flag it in the `Errors` log of the Campaign Detail page and drop the retry loop?
- [ ] **Webhook Sync:** Are incoming Webhooks from WhatsApp correctly updating the `campaign_messages` statuses to `delivered` and `read`?