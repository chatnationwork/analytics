# Research Summary: EOS-Campaign Integration Audit

## Conclusion
The current `eos-module` code is **NOT** capable of correctly sending WhatsApp messages via the Campaign module because of a "Context Gap" in the Campaigns engine. While EOS correctly fires triggers with the necessary context (e.g., `ticketCode`, `qrCodeUrl`), the Campaigns module discards this context before it reaches the message rendering engine.

## Key Findings

1.  **Context Loss in Trigger Pipeline:**
    *   `TriggerService.fire(trigger, payload)` receives the `context` object.
    *   It uses it only for filtering (`matchesTriggerConfig`).
    *   It **DOES NOT** pass it to `CampaignOrchestratorService.executeForContact`.
    *   `CampaignOrchestratorService.executeForContact` does not have a parameter to accept this context.

2.  **Missing Context in Job Queue:**
    *   `CampaignSendJob` (the BullMQ job data) does not include a field for trigger-specific context.
    *   As a result, the `SendWorker` only has access to the campaign's base template and the contact's persistent metadata.

3.  **Rendering Engine Limitation:**
    *   `TemplateRendererService.render` only accepts a `ContactEntity`.
    *   It cannot render variables from the transient trigger context (like a specific ticket code for a specific purchase).

4.  **EOS Implementation Status:**
    *   `EosTicketService` is correctly calling `TriggerService.fire` with the expected context.
    *   `EosExhibitorService`, `EosLeadService`, and `EosEventService` are also integrated with `TriggerService`.
    *   However, these messages will currently arrive with broken or missing placeholders (e.g., `{{ticketCode}}` will be empty or fallback to contact metadata which might be stale).

5.  **Resiliency & Rate Limiting:**
    *   BullMQ retry logic (3 attempts, exponential backoff) is correctly configured.
    *   Rate limiting (80 msg/s) and tiered delays for bulk sends are implemented.
    *   Permanent errors (invalid numbers) are correctly handled by marking as `FAILED` without retry.

## Recommendations
A new phase is required to:
1.  Update `TriggerService` to pass context to the orchestrator.
2.  Update `CampaignOrchestratorService` to include context in `CampaignSendJob`.
3.  Update `TemplateRendererService` to support merging trigger context with contact data.
4.  Verify end-to-end delivery of EOS triggers with dynamic content.
