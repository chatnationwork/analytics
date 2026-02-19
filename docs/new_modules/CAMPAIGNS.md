# Campaign Module

> Broadcasting WhatsApp messages to filtered contact lists with scheduling, event triggers, retries, and delivery analytics.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Contact Model Changes](#contact-model-changes)
4. [Database Schema](#database-schema)
5. [Service Breakdown](#service-breakdown)
6. [API Endpoints](#api-endpoints)
7. [Message Delivery Pipeline](#message-delivery-pipeline)
   - [WhatsApp 24h Conversation Window](#whatsapp-24h-conversation-window)
   - [Rate Limiting](#rate-limiting)
   - [Conversation Tier Limits](#conversation-tier-limits)
8. [Audience Filter DSL](#audience-filter-dsl)
9. [Campaign Types](#campaign-types)
10. [Event Triggers](#event-triggers)
11. [Error Handling & Retries](#error-handling--retries)
12. [Analytics](#analytics)
13. [Migrations](#migrations)
14. [Pending Work](#pending-work)
15. [File Inventory](#file-inventory)

---

## Overview

The Campaign Module is a new feature within the Dashboard API (`apps/dashboard-api`) that enables tenants to broadcast WhatsApp messages to filtered subsets of their contacts. It supports four campaign types (manual, scheduled, event-triggered, module-initiated) and provides full delivery lifecycle tracking.

Key design decisions:
- **BullMQ** for message delivery queue (chosen over Redis Streams for built-in retries, backoff, rate limiting, and job lifecycle management)
- **WhatsApp-only channel** initially (designed for multi-channel expansion later)
- **24h conversation window awareness** -- contacts split by `lastSeen` into free (in-window) and tier-limited (out-of-window) buckets
- **Three-layer rate limiting** -- BullMQ per-second limiter (80 msg/s), tiered staggered enqueuing, and Redis-backed 24h conversation quota
- **Filter DSL** stored as JSONB, translated to TypeORM queries at execution time
- **Batch processing** for large audiences (configurable batch size, default 500)
- **Tenant-isolated** via `tenantId` on every query

---

## Architecture

```
CampaignsController
    |
    +-- CampaignsService (CRUD, status)
    |       |
    |       +-- CampaignOrchestratorService (execute flow)
    |               |
    |               +-- AudienceService (resolve contacts)
    |               +-- BullMQ Queue (enqueue jobs)
    |                       |
    |                       +-- SendWorker (send via CRM API)
    |
    +-- CampaignAnalyticsService (metrics, errors)
    +-- AudienceService (preview)

CampaignSchedulerService (cron-parser)
    +-- CampaignOrchestratorService

TriggerService (event-driven)
    +-- CampaignOrchestratorService

TemplatesModule (External Dependency)
    +-- TemplatesService (Template lookup/parsing)
```

### Data Flow

1. **Create** -- Admin creates a campaign (draft) with audience filter and message template
2. **Launch/Schedule** -- Campaign moves to `running` or `scheduled` status
3. **Resolve** -- `AudienceService` queries contacts matching the filter
4. **Insert** -- `campaign_messages` rows created (one per recipient)
5. **Enqueue** -- BullMQ jobs enqueued in batches of 500
6. **Send** -- `SendWorker` processes each job via `WhatsappService.sendMessage()`
7. **Track** -- Status updates flow: pending -> queued -> sent -> delivered -> read (or failed)
8. **Complete** -- When all messages reach terminal state, campaign marked as completed

---

## Contact Model Changes

The `contacts` table was migrated to support campaign foreign keys and audience segmentation.

### Primary Key Migration

**Before:** Composite PK `(tenantId, contactId)` -- no single-column FK target.

**After:** UUID PK `id` with unique constraint on `(tenantId, contactId)`.

All existing code that queries by `(tenantId, contactId)` continues to work unchanged via the `ContactRepository.findOne(tenantId, contactId)` method and the unique constraint.

### New Columns

| Column | Type | Purpose |
|--------|------|---------|
| `tags` | TEXT[] | Segmentation tags (GIN-indexed) |
| `paymentStatus` | VARCHAR(20) | "paid", "unpaid", etc. for filtering |
| `optedIn` | BOOLEAN | WhatsApp Business API consent (default: true) |
| `optedInAt` | TIMESTAMPTZ | When consent was recorded |

### Repository Additions

Two new methods on `ContactRepository`:
- `findById(id: string)` -- UUID-based lookup
- `findByIds(ids: string[])` -- Bulk UUID lookup

**Entity file:** `libs/database/src/entities/contact.entity.ts`
**Repository file:** `libs/database/src/repositories/contact.repository.ts`

---

## Database Schema

### campaigns

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| tenantId | VARCHAR(50) | NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| type | campaign_type_enum | manual, event_triggered, scheduled, module_initiated |
| status | campaign_status_enum | draft (default), scheduled, running, paused, completed, failed, cancelled |
| sourceModule | VARCHAR(50) | Nullable. Which module created it (events, surveys, etc.) |
| sourceReferenceId | VARCHAR(100) | Nullable. Reference ID from source module |
| messageTemplate | JSONB | NOT NULL. WhatsApp message payload |
| audienceFilter | JSONB | Nullable. Filter DSL |
| recipientCount | INTEGER | Default 0. Snapshot at send time |
| scheduledAt | TIMESTAMPTZ | Nullable. For one-time scheduled campaigns |
| startedAt | TIMESTAMPTZ | Nullable |
| completedAt | TIMESTAMPTZ | Nullable |
| triggerType | VARCHAR(50) | Nullable. Event trigger name |
| triggerConfig | JSONB | Nullable. Trigger-specific matching config |
| createdBy | UUID | FK to users. Nullable |
| createdAt | TIMESTAMPTZ | Auto |
| updatedAt | TIMESTAMPTZ | Auto |
| templateId | UUID | Nullable. FK -> templates.id |
| templateParams | JSONB | Nullable. User-provided values for template variables |

**Indexes:** `(tenantId, status)`, `(tenantId, createdAt)`, `(tenantId, sourceModule)`

### campaign_messages

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| campaignId | UUID | FK -> campaigns.id ON DELETE CASCADE |
| tenantId | VARCHAR(50) | NOT NULL |
| contactId | UUID | FK -> contacts.id |
| recipientPhone | VARCHAR(20) | Denormalized for send worker (avoids join) |
| status | campaign_message_status_enum | pending (default), queued, sent, delivered, read, failed |
| waMessageId | VARCHAR(100) | WhatsApp message ID from API response (wamid) |
| errorMessage | TEXT | Nullable |
| errorCode | VARCHAR(50) | Nullable |
| attempts | INTEGER | Default 0 |
| sentAt | TIMESTAMPTZ | Nullable |
| deliveredAt | TIMESTAMPTZ | Nullable |
| readAt | TIMESTAMPTZ | Nullable |
| failedAt | TIMESTAMPTZ | Nullable |
| createdAt | TIMESTAMPTZ | Auto |

**Indexes:** `(campaignId)`, `(tenantId, campaignId)`, `(contactId)`, `(status)`, `(waMessageId)`

### campaign_schedules

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| campaignId | UUID | FK -> campaigns.id ON DELETE CASCADE |
| tenantId | VARCHAR(50) | NOT NULL |
| cronExpression | VARCHAR(100) | Standard cron expression |
| nextRunAt | TIMESTAMPTZ | NOT NULL. Updated after each run |
| lastRunAt | TIMESTAMPTZ | Nullable |
| isActive | BOOLEAN | Default true |
| maxRuns | INTEGER | Nullable. null = unlimited |
| runCount | INTEGER | Default 0 |
| createdAt | TIMESTAMPTZ | Auto |
| updatedAt | TIMESTAMPTZ | Auto |

**Indexes:** `(tenantId, isActive)`, `(nextRunAt)`

---

## Service Breakdown

### CampaignsService (`campaigns.service.ts`)

CRUD operations and status management.

- `create(tenantId, userId, dto)` -- Create a draft campaign
- `findById(tenantId, id)` -- Get campaign with tenant isolation
- `list(tenantId, query)` -- Paginated listing, filterable by status and sourceModule
- `update(tenantId, id, dto)` -- Update a draft campaign
- `updateStatus(id, status, extra?)` -- Change campaign status
- `cancel(tenantId, id)` -- Cancel a running or scheduled campaign
- `hydrateTemplate(campaign)` -- Internal helper to construct WhatsApp template payload from `templateId` and `templateParams`

### AudienceService (`audience.service.ts`)

Translates audience filter DSL into TypeORM queries against the contacts table. Supports splitting contacts by WhatsApp 24h conversation window.

- `resolveContacts(tenantId, filter)` -- Returns matching `ContactEntity[]`
- `resolveContactsWithWindowSplit(tenantId, filter)` -- Returns `{ inWindow, outOfWindow }` split by `lastSeen` vs 24h cutoff
- `countContacts(tenantId, filter)` -- Count without loading
- `countContactsWithWindowSplit(tenantId, filter)` -- Count with `{ total, inWindow, outOfWindow }` breakdown

Always applies:
- `tenantId` isolation
- `deactivatedAt IS NULL` (excludes deactivated contacts)
- `optedIn = TRUE` (WhatsApp consent)

Supports filtering on: `name`, `email`, `contactId`, `pin`, `yearOfBirth`, `messageCount`, `firstSeen`, `lastSeen`, `paymentStatus`, `tags`, `metadata.*` (JSONB)

### CampaignOrchestratorService (`campaign-orchestrator.service.ts`)

Coordinates the end-to-end campaign execution flow with audience window splitting and tiered delivery.

- `execute(tenantId, campaignId)` -- Full execution: resolve audience with window split, check quota, create message rows, enqueue with staggered delays
- `executeForContact(tenantId, campaignId, contactId, phone, isBusinessInitiated)` -- Single-contact execution (used by event triggers)

Execution flow:
1. Resolve audience with `resolveContactsWithWindowSplit()` (in-window vs out-of-window)
2. Pre-launch quota check for out-of-window contacts
3. Calculate `estimatedCompletionAt` from audience size and rate limit
4. Create `campaign_messages` rows with `isBusinessInitiated` flag
5. Enqueue in-window contacts first (no delay)
6. Enqueue out-of-window contacts second (staggered by tier)

Tiered staggering:
- Under 1,000: immediate enqueue
- 1,000-10,000: chunks of 100 with 1.25s delay between chunks
- 10,000-100,000: chunks of 500 with 6.25s delay between chunks

### SendWorker (`send.worker.ts`)

BullMQ processor for individual message sends. Rate-limited at 80 msg/s with dynamic rate limit on 429 errors.

- Rate limiter: 80 messages per second (WhatsApp per-number limit)
- Worker concurrency: 5
- Pre-send quota check for business-initiated sends (pauses campaign if exhausted)
- Calls `WhatsappService.sendMessage()` for each job
- On success: updates status to `sent`, stores `waMessageId`, records business-initiated sends against quota
- When WhatsApp returns a 429 (Too Many Requests) or rate limit error code (131048, 131056), the worker:
  1. Calls `worker.rateLimit(60s)` to pause the entire queue for 60 seconds
  2. Throws `RateLimitError` (does NOT count as attempt)
- On retryable error: throws to trigger BullMQ retry (exponential backoff, 30s base, 3 attempts)
- On permanent error or quota exhaustion: marks as `failed`, uses `UnrecoverableError`
- **Template Rendering**: If the message type is `template`, the worker uses `TemplateRendererService` to replace placeholders (e.g., `{{name}}`) within each template parameter value.
- After each send: checks if all campaign messages reached terminal state

### RateTrackerService (`rate-tracker.service.ts`)

Redis-backed 24h rolling counter for business-initiated conversations. Only out-of-window sends count.

- `recordBusinessSend(tenantId)` -- Increment hourly Redis bucket
- `getQuotaStatus(tenantId)` -- Returns `{ businessSent24h, tierLimit, remaining, tier }`
- `hasQuotaRemaining(tenantId)` -- Quick boolean check
- `checkQuota(tenantId, outOfWindowCount)` -- Pre-launch check with `{ canProceed, warning, quotaStatus }`

Redis key pattern: `wa:biz-conv:{phoneNumberId}:{YYYYMMDDHH}` with 25h TTL. Sums last 24 hourly buckets for rolling count.

### CampaignSchedulerService (`campaign-scheduler.service.ts`)

Cron-based service (runs every 60 seconds).

- `processRecurringSchedules()` -- Checks `campaign_schedules` with `nextRunAt <= now` and `isActive = true`
  - Respects `maxRuns` limit
  - Uses `cron-parser` to compute `nextRunAt` based on the cron expression
  - Updates `lastRunAt`, `runCount`, `nextRunAt` after each execution
- `processScheduledCampaigns()` -- Checks campaigns with `status = 'scheduled'` and `scheduledAt <= now`

### TriggerService (`trigger.service.ts`)

Handles predefined event triggers from other modules.

- `fire(trigger, payload)` -- Looks up active campaigns with matching `triggerType`, sends to the specified contact
- Validates opt-in status before sending
- Supports `triggerConfig` matching for filtering (e.g., only trigger for a specific eventId)

### CampaignAnalyticsService (`campaign-analytics.service.ts`)

Aggregation queries for campaign performance.

- `getCampaignMetrics(tenantId, campaignId)` -- Per-campaign delivery breakdown
- `getCampaignMessages(tenantId, campaignId, page, limit)` -- Per-recipient delivery log
- `getOverview(tenantId)` -- Cross-campaign tenant overview
- `getErrorBreakdown(tenantId, campaignId)` -- Error code/message grouping

---

## API Endpoints

All endpoints require JWT authentication and extract `tenantId` from the request context.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | List campaigns (paginated, filterable) |
| GET | `/campaigns/analytics/overview` | Cross-campaign analytics overview |
| GET | `/campaigns/quota` | 24h conversation quota status |
| GET | `/campaigns/:id` | Get single campaign |
| GET | `/campaigns/:id/analytics` | Campaign delivery metrics |
| GET | `/campaigns/:id/messages` | Per-recipient delivery log (paginated) |
| GET | `/campaigns/:id/errors` | Error breakdown |
| POST | `/campaigns/audience/preview` | Audience preview with window split and quota check |
| POST | `/campaigns` | Create campaign (draft) |
| PATCH | `/campaigns/:id` | Update draft campaign |
| POST | `/campaigns/:id/send` | Launch immediate execution (202 Accepted) |
| POST | `/campaigns/:id/schedule` | Schedule for later execution |
| POST | `/campaigns/:id/cancel` | Cancel running or scheduled campaign |

### DTOs

**CreateCampaignDto:**
```typescript
{
  name: string;                          // required, max 255
  type: CampaignType;                    // required (manual, event_triggered, scheduled, module_initiated)
  messageTemplate: Record<string, any>;  // required, WhatsApp message payload
  audienceFilter?: AudienceFilterDto;    // optional filter
  sourceModule?: string;                 // optional, max 50
  sourceReferenceId?: string;            // optional, max 100
  scheduledAt?: string;                  // optional ISO date
  templateId?: string;                   // optional, UUID of pre-defined template
  templateParams?: Record<string, string>; // optional, user-entered values for template {{1}}, {{2}}...
  triggerType?: string;                  // optional, max 50
  triggerConfig?: Record<string, any>;   // optional
}
```

**AudienceFilterDto:**
```typescript
{
  conditions: FilterConditionDto[];  // array of filter rules
  logic: "AND" | "OR";              // how to combine conditions
}
```

**FilterConditionDto:**
```typescript
{
  field: string;     // field name (e.g., "tags", "paymentStatus", "metadata.company")
  operator: string;  // comparison operator (eq, neq, gt, gte, lt, lte, contains, in, not_in, is_null, is_not_null)
  value: unknown;    // comparison value
}
```

---

## Message Delivery Pipeline

```
POST /campaigns/:id/send
    |
    v
CampaignsController.send()
    |
    v
CampaignOrchestratorService.execute()
    |
    +-- 1. Validate campaign status (draft or scheduled)
    +-- 2. AudienceService.resolveContactsWithWindowSplit() -> { inWindow, outOfWindow }
    +-- 3. RateTracker.checkQuota() -> verify out-of-window count vs 24h tier limit
    +-- 4. Calculate estimatedCompletionAt
    +-- 5. Mark campaign as RUNNING
    +-- 6. Enqueue in-window contacts FIRST (free, no delay)
    +-- 7. Enqueue out-of-window contacts SECOND (staggered delays based on tier)
    |
    v
BullMQ Queue "campaign:send" (rate-limited: 80 msg/s)
    |
    v
SendWorker.process() (per job)
    |
    +-- If isBusinessInitiated: check quota remaining
    +-- WhatsappService.sendMessage()
    |       |
    |       +-- Success -> status: SENT, store waMessageId
    |       |               If isBusinessInitiated: recordBusinessSend()
    |       +-- 429 / rate limit -> worker.rateLimit(60s), retry without counting attempt
    |       +-- Retryable error -> throw (BullMQ retries with 30s exponential backoff)
    |       +-- Permanent error -> status: FAILED
    |
    +-- If quota exhausted mid-campaign -> pause campaign
    +-- Check campaign completion (all messages in terminal state?)
            |
            +-- Yes -> campaign status: COMPLETED
```

### WhatsApp 24h Conversation Window

WhatsApp distinguishes two conversation types that affect cost and limits:

- **Customer-initiated (free):** Contact messaged us within the last 24 hours. We can reply freely. Does NOT count against the messaging tier limit.
- **Business-initiated (tier-limited):** Contact hasn't messaged in 24+ hours or never. Requires a template message. Counts against the 24h tier limit.

The `AudienceService.resolveContactsWithWindowSplit()` method uses `contacts.lastSeen` to split the audience:
- **In-window:** `lastSeen > now - 24h` (free to message)
- **Out-of-window:** `lastSeen <= now - 24h` or null (costs a tier slot)

### Rate Limiting

Three layers of rate limiting work together:

1. **BullMQ rate limiter (per-second):** Caps the worker at 80 messages/second (WhatsApp Cloud API per-phone-number burst limit). Applied globally across all concurrent workers.

2. **Staggered enqueuing (queue pressure):** For large audiences, jobs are enqueued with incremental delays so the queue doesn't accumulate a massive backlog:
   - Under 1,000 recipients: enqueue all immediately, rate limiter handles pacing (~12s total)
   - 1,000 -- 10,000: chunks of 100 with 1.25s delay between chunks
   - 10,000 -- 100,000: chunks of 500 with 6.25s delay between chunks

3. **24h conversation quota (cross-campaign):** Redis-backed rolling counter tracks business-initiated conversations per phone number. Checked pre-launch and during execution. Campaign paused if quota exhausted.

### Dynamic Rate Limiting

When WhatsApp returns a 429 (Too Many Requests) or rate limit error code (131048, 131056), the worker:
1. Calls `worker.rateLimit(60_000)` to pause the entire queue for 60 seconds
2. Throws `Worker.RateLimitError()` which does NOT count as a failed attempt
3. After 60 seconds, BullMQ automatically resumes processing

### Conversation Tier Limits

| Tier | 24h Limit | Typical Use |
|------|-----------|------------|
| Tier 1 | 1,000 | New WhatsApp Business numbers |
| Tier 2 | 10,000 | Established businesses (default) |
| Tier 3 | 100,000 | Large organizations |
| Tier 4 | Unlimited | Enterprise |

### BullMQ Queue Configuration

- **Queue name:** `campaign:send`
- **Rate limiter:** 80 messages per 1,000ms
- **Worker concurrency:** 5
- **Default attempts:** 3
- **Backoff:** Exponential, 30 second base delay
- **Completed job retention:** 7 days
- **Failed job retention:** 30 days
- **Job ID format:** `cm-{campaignMessageId}` (prevents duplicates)
- **Redis:** Same Redis instance as the analytics event queue

---

## Audience Filter DSL

Filters are stored as JSONB on the campaign record and evaluated at execution time. The `AudienceService` translates filter conditions into SQL WHERE clauses.

### Example Filters

**All paid contacts with specific tag:**
```json
{
  "conditions": [
    { "field": "paymentStatus", "operator": "eq", "value": "paid" },
    { "field": "tags", "operator": "contains", "value": "vip" }
  ],
  "logic": "AND"
}
```

**Contacts who haven't been seen since a date:**
```json
{
  "conditions": [
    { "field": "lastSeen", "operator": "lt", "value": "2025-01-01" }
  ],
  "logic": "AND"
}
```

**Contacts matching metadata field:**
```json
{
  "conditions": [
    { "field": "metadata.company", "operator": "eq", "value": "Acme Corp" }
  ],
  "logic": "AND"
}
```

### Supported Operators

| Operator | SQL | Notes |
|----------|-----|-------|
| eq | `=` | Exact match |
| neq | `!=` | Not equal |
| gt | `>` | Greater than |
| gte | `>=` | Greater than or equal |
| lt | `<` | Less than |
| lte | `<=` | Less than or equal |
| contains | `ILIKE '%value%'` | Substring match (standard fields) |
| in | `IN (...)` | Value in list |
| not_in | `NOT IN (...)` | Value not in list |
| is_null | `IS NULL` | Null check |
| is_not_null | `IS NOT NULL` | Not null check |

### Tag-Specific Operators

| Operator | SQL | Notes |
|----------|-----|-------|
| contains | `value = ANY(tags)` | Tag array contains value |
| contains_any | `tags && value` | Array overlap (GIN-indexed) |
| contains_all | `tags @> value` | Array contains all |

### Security

- **Field whitelist:** Only `ALLOWED_FIELDS` set can be queried (prevents SQL injection via field name)
- **JSONB access:** `metadata.*` fields use `->>'key'` accessor
- **Tenant isolation:** Always applied as first WHERE clause
- **Compliance:** `deactivatedAt IS NULL` and `optedIn = TRUE` always enforced

---

## Campaign Types

### Manual
Admin creates and launches via the Dashboard API/UI. Audience resolved at launch time.

### Scheduled
Campaign has a `scheduledAt` date. Admin sets status to `scheduled`, and the `CampaignSchedulerService` cron picks it up when `scheduledAt <= now`.

### Event-Triggered
Campaign listens for a specific `triggerType` (e.g., `payment.received`). When the trigger fires, the `TriggerService` sends the campaign message to the triggering contact. Campaign stays in `running` state indefinitely.

### Module-Initiated
Created programmatically by other modules (events, surveys, hypecards, engagement). Uses `sourceModule` and `sourceReferenceId` to link back. Can be any execution type (immediate, scheduled, or triggered).

---

## Event Triggers

Predefined trigger types that modules can fire:

| Trigger | Source Module |
|---------|-------------|
| `ticket.purchased` | Events / Ticketing |
| `event.checkin` | Events / Ticketing |
| `event.registration` | Events / Ticketing |
| `survey.completed` | Surveys |
| `content.published` | Content |
| `contact.created` | General / CRM |
| `payment.received` | General / CRM |
| `payment.overdue` | General / CRM |
| `session.resolved` | Agent System |

### Usage by Other Modules

```typescript
// In any module's service:
import { TriggerService, CampaignTrigger } from "../campaigns";

await this.triggerService.fire(CampaignTrigger.TICKET_PURCHASED, {
  tenantId: "tenant-123",
  contactId: "254712345678",   // phone number
  context: { eventId: "evt-abc" },  // optional matching context
});
```

The `TriggerService`:
1. Looks up active campaigns with `triggerType = 'ticket.purchased'`
2. Optionally matches `triggerConfig` against the provided `context`
3. Resolves the contact UUID from `contactId` (phone)
4. Validates opt-in status
5. Enqueues a single message send via the orchestrator

---

## Error Handling & Retries

### Error Classification

The `SendWorker` classifies WhatsApp API errors into three categories:

**Rate limit errors** (dynamic queue pause, no attempt count):
- HTTP 429 (Too Many Requests)
- WhatsApp error codes: `131048` (rate limit), `131056` (pair rate limit)
- Handled via `Worker.RateLimitError()` -- pauses the queue for 60s then retries without incrementing the attempt counter

**Retryable errors** (BullMQ will retry with exponential backoff):
- HTTP 500, 503 (Server errors)
- Network errors: timeout, ECONNREFUSED, ECONNRESET

**Permanent errors** (marked as failed, no retry):
- HTTP 400 (Bad Request)
- Invalid phone number
- Template not approved
- 24h conversation quota exhausted (campaign paused)
- Any error not matching retryable patterns

### Retry Configuration

- **Max attempts:** 3 (configurable in BullMQ queue options)
- **Backoff type:** Exponential
- **Base delay:** 30 seconds
- **Sequence:** 30s, 60s, 120s
- **Rate limit pause:** 60 seconds (does not count as an attempt)

### Quota Exhaustion Handling

If the 24h conversation tier limit is hit mid-campaign:
1. SendWorker detects quota exhaustion on the next business-initiated send
2. Campaign status set to `PAUSED`
3. Remaining jobs fail with `UnrecoverableError`
4. Admin can resume the campaign later when quota resets

### Last-Attempt Handling

On the final attempt (attempt 3 of 3), if the send still fails:
1. Message marked as `failed` with error details
2. Campaign completion check triggered
3. No further retries

---

## Analytics

### Per-Campaign Metrics (`GET /campaigns/:id/analytics`)

```typescript
{
  total: number;        // total messages in campaign
  pending: number;      // not yet queued
  queued: number;       // in BullMQ queue
  sent: number;         // sent to WhatsApp
  delivered: number;    // confirmed delivered
  read: number;         // confirmed read
  failed: number;       // permanently failed
  deliveryRate: number; // (delivered + read) / sent * 100
  readRate: number;     // read / sent * 100
  failureRate: number;  // failed / total * 100
}
```

### Cross-Campaign Overview (`GET /campaigns/analytics/overview`)

```typescript
{
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}
```

### Error Breakdown (`GET /campaigns/:id/errors`)

Groups failed messages by error code and message for debugging.

```typescript
[
  { errorCode: "131048", errorMessage: "Rate limit exceeded", count: 15 },
  { errorCode: "400", errorMessage: "Invalid phone number format", count: 3 }
]
```

---

## Migrations

Three migrations were created for the campaign module:

| Timestamp | Name | Status | Description |
|-----------|------|--------|-------------|
| 1770900000000 | MigrateContactUuidPk | **Needs re-creation** | Add UUID `id` column to contacts, swap PK from composite to UUID, add unique constraint on `(tenantId, contactId)` |
| 1770900100000 | AddContactCampaignFields | **Needs re-creation** | Add `tags`, `paymentStatus`, `optedIn`, `optedInAt` columns and indexes to contacts |
| 1770900200000 | CreateCampaignTables | **Created** | Create `campaigns`, `campaign_messages`, `campaign_schedules` tables with enums and indexes |

> **Important:** The first two migrations (contact changes) need to be re-created. They were part of the development process but the migration files are not present on disk. The `CreateCampaignTables` migration depends on the contact UUID PK being in place (FK from `campaign_messages.contactId` to `contacts.id`).

### Migration Order

Migrations run automatically before app start via the Docker entrypoint script (`scripts/docker-dashboard-api-entrypoint.sh`):

```bash
npm run db:migrate   # runs typeorm migration:run
npm run start:prod   # starts the NestJS app
```

---

## Pending Work

### Webhook Status Updates (webhook-status)

Hook into the existing WhatsApp webhook handler to update `campaign_messages` delivery and read status:
- When a WhatsApp status webhook arrives (delivered, read), look up the `campaign_messages` row by `waMessageId`
- Update status and timestamps (`deliveredAt`, `readAt`)
- This enables the `delivered` and `read` columns in analytics to be populated

### Billing Integration (billing-integration)

Integrate token reservation/debit/release with the wallet service during campaign execution:
- Reserve tokens when campaign is launched (based on audience count)
- Debit per successful send
- Release unused tokens on campaign completion/cancellation

### Contact Migration Files

Re-create the two missing migration files:
- `MigrateContactUuidPk` -- UUID PK swap for contacts table
- `AddContactCampaignFields` -- New campaign-related columns on contacts

---

## File Inventory

### Entities (libs/database/src/entities/)

| File | Description |
|------|-------------|
| `contact.entity.ts` | Updated with UUID PK, tags, paymentStatus, optedIn fields |
| `campaign.entity.ts` | Campaign definition with type, status, template, filter, estimatedCompletionAt |
| `campaign-message.entity.ts` | Per-recipient delivery log with lifecycle tracking and isBusinessInitiated flag |
| `campaign-schedule.entity.ts` | Recurring campaign configuration |
| `index.ts` | Updated to export all campaign entities |

### Migrations (libs/database/src/migrations/)

| File | Description |
|------|-------------|
| `1770900200000-CreateCampaignTables.ts` | Creates campaigns, campaign_messages, campaign_schedules tables |

### Module (apps/dashboard-api/src/campaigns/)

| File | Description |
|------|-------------|
| `campaigns.module.ts` | NestJS module with BullMQ queue config, Redis client, rate limiter |
| `campaigns.controller.ts` | REST API endpoints including quota and enhanced audience preview |
| `campaigns.service.ts` | CRUD and status management |
| `audience.service.ts` | Filter DSL to TypeORM query translation with 24h window split |
| `campaign-orchestrator.service.ts` | Execution coordinator with tiered delivery and quota checks |
| `send.worker.ts` | BullMQ message send processor with rate limiting and quota tracking |
| `template-renderer.service.ts` | Renders placeholders (e.g. `{{name}}`) in template parameters |
| `rate-tracker.service.ts` | Redis-backed 24h conversation quota counter |
| `campaign-scheduler.service.ts` | Cron-based schedule checker |
| `trigger.service.ts` | Event trigger handler |
| `campaign-analytics.service.ts` | Metrics aggregation |
| `constants.ts` | Queue names, job types, trigger enum, rate limiting config, delivery tiers |
| `dto/create-campaign.dto.ts` | Campaign creation DTO |
| `dto/update-campaign.dto.ts` | Campaign update DTO |
| `dto/campaign-query.dto.ts` | Campaign listing query DTO |

### Templates Module (apps/dashboard-api/src/templates/)

| File | Description |
|------|-------------|
| `templates.module.ts` | Module definition |
| `templates.controller.ts` | API for template management |
| `templates.service.ts` | Logic for processing and storing templates |

### Modified Files

| File | Change |
|------|--------|
| `apps/dashboard-api/src/dashboard.module.ts` | Imports CampaignsModule and redisConfig |
| `libs/database/src/database.module.ts` | Registers campaign and template entities |
| `libs/database/src/entities/index.ts` | Exports campaign/template entities |
| `libs/database/src/entities/contact.entity.ts` | UUID PK, new columns |
| `libs/database/src/repositories/contact.repository.ts` | findById, findByIds methods |
| `docs/ARCHITECTURE_AND_DEPLOYMENT.md` | Campaign module documentation |

### Dependencies Added

| Package | Purpose |
|---------|---------|
| `@nestjs/bullmq` | BullMQ integration for NestJS |
| `bullmq` | Redis-based job queue |
| `cron-parser` | Accurate next-run calculation for recurring campaigns |
