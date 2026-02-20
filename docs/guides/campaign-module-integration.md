# Using the Campaign Module from Other Services

This guide explains how other services within the dashboard API (e.g. EOS events, surveys, content) can use the campaign module to send WhatsApp broadcasts and event-triggered messages.

---

## Table of Contents

1. [Overview](#overview)
2. [Module Setup](#module-setup)
3. [Integration Patterns](#integration-patterns)
4. [Creating and Executing Campaigns Programmatically](#creating-and-executing-campaigns-programmatically)
5. [Event-Triggered Campaigns](#event-triggered-campaigns)
6. [Data Structures](#data-structures)
7. [Examples from EOS](#examples-from-eos)

---

## Overview

The campaign module provides two main ways for other services to send WhatsApp messages:

| Pattern | Use Case | Services |
|---------|----------|----------|
| **Create + Execute** | Programmatic broadcast to a filtered audience (e.g. event attendees) | EOS events (`bulkBroadcast`) |
| **Event Triggers** | Fire a trigger when something happens; campaigns listening for that trigger send to the relevant contact | EOS tickets, exhibitors, leads |

Both patterns require importing `CampaignsModule` into your module and injecting the appropriate services.

---

## Module Setup

### 1. Import CampaignsModule

In your feature module (e.g. `EosModule`), add `CampaignsModule` to `imports`:

```typescript
// apps/dashboard-api/src/eos/eos.module.ts
import { CampaignsModule } from "../campaigns/campaigns.module";

@Module({
  imports: [
    CampaignsModule,
    // ... other imports
  ],
  // ...
})
export class EosModule {}
```

### 2. Exports from CampaignsModule

The following services are exported and can be injected into your services:

| Service | Purpose |
|---------|---------|
| `CampaignsService` | Create, update, find campaigns; duplicate; status management |
| `CampaignOrchestratorService` | Execute a campaign (resolve audience, enqueue sends) or send to a single contact |
| `TriggerService` | Fire event triggers so trigger-based campaigns can send to a contact |
| `RateTrackerService` | Check 24h conversation quota (for optional pre-flight checks) |

---

## Integration Patterns

### Pattern A: Create + Execute (Programmatic Broadcast)

Use when you want to send a one-off or scheduled message to a defined audience that your service knows how to filter.

**Flow:**
1. Create a campaign with `CampaignsService.create()`
2. Execute it with `CampaignOrchestratorService.execute()`

**Example:** EOS event bulk broadcast to all attendees (filtered by event metadata).

### Pattern B: Event Triggers

Use when a specific event happens (e.g. ticket issued, exhibitor approved) and you want any configured campaigns listening for that trigger to send to the affected contact.

**Flow:**
1. Admin creates a campaign in the Broadcast UI with `triggerType: "ticket.issued"`
2. When a ticket is issued, your service calls `TriggerService.fire(CampaignTrigger.TICKET_ISSUED, { ... })`
3. The trigger service finds active campaigns for that trigger and sends to the contact

**Example:** Send welcome message when a ticket is purchased.

---

## Creating and Executing Campaigns Programmatically

### 1. Inject Services

```typescript
import { CampaignsService } from "../campaigns/campaigns.service";
import { CampaignOrchestratorService } from "../campaign-orchestrator.service";
import { CampaignType } from "@lib/database";

@Injectable()
export class MyService {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly campaignOrchestrator: CampaignOrchestratorService,
  ) {}
}
```

### 2. Create a Campaign

```typescript
const campaign = await this.campaignsService.create(
  tenantId,
  userId,
  {
    name: "Broadcast: My Event - 2025-02-19",
    type: CampaignType.MANUAL,
    messageTemplate: {
      text: { body: "Hello! Your event is starting soon." },
    },
    audienceFilter: {
      logic: "AND",
      conditions: [
        { field: "metadata.eventId", operator: "eq", value: eventId },
        // or use tags: { field: "tags", operator: "contains", value: "event-attendees" }
      ],
    },
    sourceModule: "eos_events",
    sourceReferenceId: eventId,
  },
);
```

### 3. Execute the Campaign

```typescript
await this.campaignOrchestrator.execute(tenantId, campaign.id);
```

The orchestrator will:
- Resolve contacts matching the audience filter
- Create `campaign_messages` rows
- Enqueue BullMQ jobs
- Respect 24h conversation window and tier limits

### CreateCampaignDto Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Campaign display name |
| `type` | Yes | `manual`, `scheduled`, `event_triggered`, or `module_initiated` |
| `messageTemplate` | Yes* | WhatsApp payload (text, image, template, etc.). *Optional if `templateId` provided |
| `templateId` | No | UUID of a saved WhatsApp template (from Templates module) |
| `templateParams` | No | Map of template variable values (e.g. `{"1": "{{name}}"}`) |
| `audienceFilter` | No | Filter rules (see [Audience Filter](#audience-filter)) |
| `segmentId` | No | Use a saved segment instead of `audienceFilter` |
| `sourceModule` | No | Identifier for your module (e.g. `"eos_events"`) |
| `sourceReferenceId` | No | Your entity ID (e.g. event ID) for traceability |
| `scheduledAt` | No | ISO string for one-time scheduled send |
| `recurrence` | No | For recurring campaigns |
| `triggerType` | No | For trigger-based campaigns (see [Event Triggers](#event-triggered-campaigns)) |
| `triggerConfig` | No | Extra filter for trigger context (e.g. `{ eventId: "..." }`) |

---

## Event-Triggered Campaigns

### 1. Available Triggers

Defined in `apps/dashboard-api/src/campaigns/constants.ts`:

```typescript
export enum CampaignTrigger {
  TICKET_PURCHASED = "ticket.purchased",
  TICKET_ISSUED = "ticket.issued",
  EVENT_CHECKIN = "event.checkin",
  EVENT_REGISTRATION = "event.registration",
  EVENT_PUBLISHED = "event.published",
  EXHIBITOR_APPROVED = "exhibitor.approved",
  EVENT_COMPLETED = "event.completed",
  SURVEY_COMPLETED = "survey.completed",
  CONTENT_PUBLISHED = "content.published",
  CONTACT_CREATED = "contact.created",
  PAYMENT_RECEIVED = "payment.received",
  PAYMENT_OVERDUE = "payment.overdue",
  SESSION_RESOLVED = "session.resolved",
  HOT_LEAD_CAPTURED = "lead.hot_captured",
  EXHIBITOR_INVITED = "exhibitor.invited",
}
```

### 2. Fire a Trigger

```typescript
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";

await this.triggerService.fire(CampaignTrigger.TICKET_ISSUED, {
  tenantId: organizationId,
  contactId: ticket.contactId,  // Phone or contactId - must exist in contacts
  context: { eventId, ticketTypeId },  // Optional: used to match triggerConfig
});
```

### 3. How It Works

- Finds campaigns with `triggerType = "ticket.issued"` and `status = "running"`
- Optionally filters by `triggerConfig` (e.g. only for a specific `eventId`)
- Resolves the contact by `contactId` (phone)
- Skips if contact is opted out or deactivated
- Sends the campaign message to that single contact

### 4. Adding a New Trigger

1. Add the trigger to `CampaignTrigger` enum in `constants.ts`
2. Fire it from your service with `TriggerService.fire()`
3. Admins can create trigger-based campaigns in the Broadcast UI and select your trigger

---

## Data Structures

### Audience Filter

```typescript
interface AudienceFilter {
  logic: "AND" | "OR";
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}
```

### Supported Fields

| Field | Type | Example Operators |
|-------|------|-------------------|
| `contactId` | string | eq, contains |
| `name` | string | eq, contains, starts_with |
| `email` | string | eq, contains |
| `yearOfBirth` | number | eq, gt, gte, lt, lte |
| `tags` | string/array | contains, contains_any, contains_all |
| `paymentStatus` | string | eq |
| `metadata.<key>` | string | eq, contains |

### Message Template (WhatsApp)

**Text:**
```typescript
{ text: { body: "Hello {{name}}" } }
```

**Template (from Templates module):**
```typescript
{
  templateId: "uuid-of-template",
  templateParams: { "1": "{{name}}", "2": "{{metadata.balance}}" }
}
```

---

## Examples from EOS

### EOS Event Bulk Broadcast

`EosEventService.bulkBroadcast()` creates a campaign and executes it:

```typescript
// apps/dashboard-api/src/eos/eos-event.service.ts
const campaign = await this.campaignsService.create(
  organizationId,
  userId,
  {
    name: `Broadcast: ${event.name} - ${new Date().toLocaleDateString()}`,
    type: CampaignType.MANUAL,
    messageTemplate: { text: { body: messageBody } },
    audienceFilter: {
      logic: "OR",
      conditions: [
        { field: "metadata.eventName", operator: "eq", value: event.name },
      ],
    },
  },
);
return this.campaignOrchestrator.execute(organizationId, campaign.id);
```

### EOS Ticket Issued Trigger

`EosTicketService` fires when a ticket is issued or when a check-in happens:

```typescript
await this.triggerService.fire(CampaignTrigger.TICKET_ISSUED, {
  tenantId: ticket.ticketType.event.organizationId,
  contactId: ticket.contactId,
});
```

### EOS Exhibitor Approved Trigger

`EosExhibitorService` fires when an exhibitor is approved:

```typescript
await this.triggerService.fire(CampaignTrigger.EXHIBITOR_APPROVED, {
  tenantId: exhibitor.organizationId,
  contactId: exhibitor.contactPhone,
});
```

### EOS Hot Lead Captured

`EosLeadService` fires when a hot lead is captured (with context for template variables):

```typescript
await this.triggerService.fire(CampaignTrigger.HOT_LEAD_CAPTURED, {
  tenantId: lead.exhibitor.organizationId,
  contactId: lead.exhibitor.contactId,
  context: {
    leadName: lead.contact?.name || "Unknown Lead",
    leadPhone: lead.contact?.contactId,
    aiIntent: lead.aiIntent,
  },
});
```

---

## References

- [Campaign Module (new_modules/CAMPAIGNS.md)](../new_modules/CAMPAIGNS.md) – Full architecture and schema
- [Campaign Management Guide](../features/campaigns.md) – User-facing features
- [Message Placeholders](../features/message-placeholders.md) – Template variable substitution
