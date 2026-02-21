# Phase Plan: Campaign Module Context Gap Fix and EOS Verification

## Goal
Enable the Campaign module to correctly handle transient context (like ticket codes, QR URLs) passed from event-triggered campaigns (EOS) and verify end-to-end delivery of WhatsApp messages with dynamic placeholders.

## 1. Research (Completed)
- **Status:** Done
- **Findings:** See `docs/new_modules/eos-campaign-whatsapp-research.md`. The `context` passed from `TriggerService` is currently discarded and not available for rendering in `SendWorker`.

## 2. Implementation Strategy

### Task 2.1: Update `CampaignSendJob` Interface
- **File:** `apps/dashboard-api/src/campaigns/campaign-orchestrator.service.ts`
- **Action:** Add `triggerContext?: Record<string, unknown>` to the `CampaignSendJob` interface.

### Task 2.2: Update `CampaignOrchestratorService`
- **File:** `apps/dashboard-api/src/campaigns/campaign-orchestrator.service.ts`
- **Action:** Update `executeForContact` signature to accept an optional `context` object and pass it to the BullMQ job data.

### Task 2.3: Update `TriggerService`
- **File:** `apps/dashboard-api/src/campaigns/trigger.service.ts`
- **Action:** Update the call to `this.orchestrator.executeForContact` to pass `payload.context`.

### Task 2.4: Update `TemplateRendererService`
- **File:** `apps/dashboard-api/src/campaigns/template-renderer.service.ts`
- **Action:** Update the `render` method to accept an optional `context` map. Placeholders should prioritize `context` keys over `ContactEntity` fields.

### Task 2.5: Update `SendWorker`
- **File:** `apps/dashboard-api/src/campaigns/send.worker.ts`
- **Action:** Extract `triggerContext` from `job.data` and pass it to `templateRenderer.render`.

## 3. Verification Strategy

### Task 3.1: Unit Test for `TemplateRendererService`
- **File:** `apps/dashboard-api/src/campaigns/template-renderer.service.spec.ts`
- **Test Case:** Verify that placeholders are correctly replaced by merging `contact` and `context` data, with `context` taking precedence for conflicting keys.

### Task 3.2: Integration Test for `TriggerService` to `SendWorker`
- **Action:** Create a test script that fires a `TICKET_ISSUED` trigger and verifies that the `SendWorker` (mocking `WhatsappService`) receives a rendered payload with the expected dynamic data (e.g. `ticketCode`).

### Task 3.3: EOS Module E2E Smoke Test
- **Action:** Use an existing test or create a script (e.g., `scripts/verify-eos-campaign.ts`) to:
    1.  Create a test contact and an active `module_initiated` campaign.
    2.  Invoke `EosTicketService.initiatePurchase` and then `fulfillTicket`.
    3.  Verify the `campaign_messages` table shows a row with the correctly rendered message body (including ticket code).

## 4. Final Review
- [ ] Confirm all EOS triggers (`TICKET_ISSUED`, `EVENT_CHECKIN`, `EXHIBITOR_INVITED`, etc.) correctly deliver dynamic variables.
- [ ] Ensure no regressions in bulk campaign sends (which do not use `triggerContext`).

---

## 5. Post-Implementation & User Verification (Follow-up)

Once the implementation is complete, the following steps should be taken to verify it's working via the UI:

### Step 1: Create a Trigger-Based Campaign in the UI
1.  Navigate to **Broadcast** > **New Campaign**.
2.  **Details**: 
    - Name: "EOS Ticket Confirmation Test"
    - Type: **WhatsApp Template** (or Custom Text)
    - Trigger Type: Select `ticket.issued` (Note: Ensure the UI supports selecting trigger types for `module_initiated` campaigns).
3.  **Message**: 
    - If using Custom Text, use placeholders like: `Hi {{name}}, your ticket for {{eventName}} is confirmed. Code: {{ticketCode}}. QR: {{qrCodeUrl}}`.
    - If using Template, map the template variables (e.g., `{{1}}`, `{{2}}`) to the corresponding placeholder strings.
4.  **Audience**: Select "Trigger Based" (No manual filter needed).
5.  **Review**: Save and Launch. The campaign status should be `RUNNING`.

### Step 2: Trigger the Event (Simulated Purchase)
1.  Use the `scripts/simulate_inbound.ts` or a specialized script to call the `EosTicketService.initiatePurchase` endpoint for a test phone number.
2.  Alternatively, use `curl` to hit the ticket purchase endpoint.

### Step 3: Verify Delivery
1.  Go to the **Campaign Detail** page for "EOS Ticket Confirmation Test".
2.  Check the **Message Log**. You should see a new entry for your test phone number.
3.  Click on the entry to see the **Rendered Message Content**.
4.  **Verification**: Confirm that `{{ticketCode}}` and `{{qrCodeUrl}}` have been replaced with real values from the ticket, not just empty strings or fallbacks.

### Step 4: Debugging (If needed)
- Check `apps/dashboard-api` logs for `TriggerService` or `SendWorker` errors.
- Inspect the `campaign_messages` table directly: `SELECT * FROM campaign_messages ORDER BY created_at DESC LIMIT 5;`.
- Verify the BullMQ dashboard (if available) for failed jobs in the `campaign-send` queue.
