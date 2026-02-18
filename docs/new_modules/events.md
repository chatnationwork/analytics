# Module I: EOS (Events & Exhibitor Operating System)

The EOS module is a multi-tenant infrastructure designed to handle the full lifecycle of high-stakes events, from viral HypeCard-driven registration to AI-powered lead qualification.

---

## 1. Overview

The EOS-Events Module enables "Organizers" (Primary Tenants) to create events, manage ticket sales, and onboard "Exhibitors" (Sub-Tenants). It bridges the gap between physical interactions and digital CRM data using WhatsApp QR flows.

### Key Design Decisions

- **Asynchronous HypeCards:** Generation of social assets is offloaded to BullMQ background workers to ensure `< 200ms` API response times.
- **Decoupled Payments:** The ticketing logic does not call M-Pesa directly; it utilizes a shared `PaymentService` and listens for state-change events.
- **AI Intent Extraction:** Uses the Central AI Brain to classify leads into `cold`, `warm`, or `hot` based on natural conversation.
- **JSONB Booth Grid:** Avoids complex spatial databases by using a relative coordinate grid stored in `exhibitors.booth_location` JSONB for venue mapping.
- **Campaign Integration:** Ticket issuance and hot-lead alerts are delivered via the Campaigns module `TriggerService` using the `module_initiated` campaign type, keeping WhatsApp delivery concerns outside this module.

---

## 2. Architecture

The module operates as a core service within `apps/dashboard-api/src/eos-events/`, interacting with:

- **Campaigns module** (`TriggerService`) for WhatsApp message delivery.
- **Billing module** (`WalletService`) for token reservation and debit on HypeCard generation.
- **HypeCard module** (`generated_cards` table) for social asset creation.

```
EosEventsController
    |
    +-- EventService (CRUD, venue layout)
    +-- TicketService (purchase initiation, M-Pesa callback)
    +-- LeadService (QR capture, AI intent, exhibitor notification)
            |
            +-- BullMQ Worker: LeadProcessorWorker (AI analysis)
            +-- BullMQ Worker: HypeCardWorker (card generation)
            +-- TriggerService (campaigns module — hot-lead alerts, ticket delivery)
```

---

## 3. Tenancy & Isolation

All tables use `organization_id` (UUID FK to `organizations.id`) for Row-Level Security (RLS), consistent with the global schema convention.

- **Organizer Context:** Queries scoped by `organization_id` (e.g., viewing all leads and tickets for their event).
- **Exhibitor Context:** Exhibitors are rows in the `exhibitors` table linked to both `event_id` and optionally `organization_id` (if the exhibitor has their own ChatNation account). Lead access is always scoped to `exhibitor_id`.

> **Naming note:** All columns and tables follow the project-wide convention: lowercase `snake_case` for columns (e.g., `organization_id`, `created_at`), plural `snake_case` for table names (e.g., `ticket_types`, `exhibitor_products`). Entity property names in TypeORM use `camelCase` via the `@Column({ name: 'snake_case' })` decorator.

---

## 4. Database Schema

All tables already exist in `DATABASE_SCHEMA.md`. The entities below map directly to those tables. **Do not create new migrations for these tables.** New columns specific to this module are called out explicitly.

### Table: `events`

Defined in `DATABASE_SCHEMA.md §4.1`. The `settings` JSONB column stores EOS-specific flags:

```json
{
  "hype_card_on_reg": false,
  "venue_map_config": {
    "grid": { "cols": 10, "rows": 10 },
    "slots": [{ "id": "A1", "x": 0, "y": 0 }]
  }
}
```

| Column            | Type         | Notes                                          |
| ----------------- | ------------ | ---------------------------------------------- |
| `id`              | UUID         | PK                                             |
| `organization_id` | UUID         | FK → `organizations.id`. Organizer tenant.     |
| `name`            | VARCHAR(255) | NOT NULL                                       |
| `slug`            | VARCHAR(100) | Unique URL identifier                          |
| `description`     | TEXT         |                                                |
| `starts_at`       | TIMESTAMPTZ  | NOT NULL                                       |
| `ends_at`         | TIMESTAMPTZ  | NOT NULL                                       |
| `timezone`        | VARCHAR(50)  | Default `'Africa/Nairobi'`                     |
| `venue_name`      | VARCHAR(255) |                                                |
| `venue_address`   | TEXT         |                                                |
| `is_virtual`      | BOOLEAN      | Default false                                  |
| `virtual_url`     | TEXT         |                                                |
| `cover_image_url` | TEXT         |                                                |
| `settings`        | JSONB        | `{ hype_card_on_reg, venue_map_config }`       |
| `status`          | VARCHAR(20)  | `draft`, `published`, `cancelled`, `completed` |
| `published_at`    | TIMESTAMPTZ  |                                                |
| `created_at`      | TIMESTAMPTZ  | Auto                                           |
| `updated_at`      | TIMESTAMPTZ  | Auto                                           |

**Indexes:** `idx_events_org`, `idx_events_dates`, `idx_events_status`

---

### Table: `ticket_types`

Defined in `DATABASE_SCHEMA.md §4.1`. No additions needed.

| Column           | Type          | Notes                              |
| ---------------- | ------------- | ---------------------------------- |
| `id`             | UUID          | PK                                 |
| `event_id`       | UUID          | FK → `events.id` ON DELETE CASCADE |
| `name`           | VARCHAR(100)  | NOT NULL                           |
| `description`    | TEXT          |                                    |
| `price`          | DECIMAL(10,2) | NOT NULL, default 0                |
| `currency`       | VARCHAR(3)    | Default `'KES'`                    |
| `quantity_total` | INTEGER       |                                    |
| `quantity_sold`  | INTEGER       | Default 0                          |
| `max_per_order`  | INTEGER       | Default 10                         |
| `sales_start_at` | TIMESTAMPTZ   |                                    |
| `sales_end_at`   | TIMESTAMPTZ   |                                    |
| `is_active`      | BOOLEAN       | Default true                       |
| `sort_order`     | INTEGER       | Default 0                          |
| `created_at`     | TIMESTAMPTZ   | Auto                               |

---

### Table: `tickets`

Defined in `DATABASE_SCHEMA.md §4.1`. The `payment_reference` column stores the M-Pesa `CheckoutRequestID`. The `hype_card_url` is stored as a `generated_cards` FK (see §4.4) — add the following column via migration:

| Column              | Type          | Notes                                                            |
| ------------------- | ------------- | ---------------------------------------------------------------- |
| `id`                | UUID          | PK                                                               |
| `ticket_type_id`    | UUID          | FK → `ticket_types.id`                                           |
| `contact_id`        | UUID          | FK → `contacts.id`                                               |
| `ticket_code`       | VARCHAR(20)   | UNIQUE NOT NULL. QR code value.                                  |
| `qr_code_url`       | TEXT          | Public URL of QR image                                           |
| `holder_name`       | VARCHAR(255)  |                                                                  |
| `holder_email`      | VARCHAR(255)  |                                                                  |
| `holder_phone`      | VARCHAR(20)   |                                                                  |
| `amount_paid`       | DECIMAL(10,2) |                                                                  |
| `payment_reference` | VARCHAR(100)  | M-Pesa `CheckoutRequestID`                                       |
| `payment_status`    | VARCHAR(20)   | `pending`, `completed`, `failed`                                 |
| `payment_metadata`  | JSONB         | `{ mpesa_receipt, checkout_request_id }` — **ADD via migration** |
| `hype_card_id`      | UUID          | FK → `generated_cards.id` — **ADD via migration**                |
| `status`            | VARCHAR(20)   | `valid`, `used`, `cancelled`, `refunded`                         |
| `checked_in_at`     | TIMESTAMPTZ   |                                                                  |
| `created_at`        | TIMESTAMPTZ   | Auto                                                             |

**Migration required:** Add `payment_metadata JSONB` and `hype_card_id UUID REFERENCES generated_cards(id)` to the `tickets` table.

---

### Table: `exhibitors`

Defined in `DATABASE_SCHEMA.md §4.1`. No additions needed. The `booth_location` JSONB (`{ x, y, width, height }`) is the source of truth for the venue grid renderer.

| Column            | Type         | Notes                                                                      |
| ----------------- | ------------ | -------------------------------------------------------------------------- |
| `id`              | UUID         | PK                                                                         |
| `event_id`        | UUID         | FK → `events.id` ON DELETE CASCADE                                         |
| `organization_id` | UUID         | FK → `organizations.id`. Nullable — only set if exhibitor has own account. |
| `name`            | VARCHAR(255) | NOT NULL                                                                   |
| `description`     | TEXT         |                                                                            |
| `logo_url`        | TEXT         |                                                                            |
| `booth_number`    | VARCHAR(50)  |                                                                            |
| `booth_location`  | JSONB        | `{ x, y, width, height }`                                                  |
| `contact_name`    | VARCHAR(255) |                                                                            |
| `contact_email`   | VARCHAR(255) |                                                                            |
| `contact_phone`   | VARCHAR(20)  |                                                                            |
| `settings`        | JSONB        | Default `{}`                                                               |
| `status`          | VARCHAR(20)  | `pending`, `approved`, `rejected`                                          |
| `created_at`      | TIMESTAMPTZ  | Auto                                                                       |
| `updated_at`      | TIMESTAMPTZ  | Auto                                                                       |

---

### Table: `leads`

Defined in `DATABASE_SCHEMA.md §4.1`. Requires additional columns for AI enrichment. **ADD via migration:**

| Column                | Type        | Notes                                                                                        |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `id`                  | UUID        | PK                                                                                           |
| `exhibitor_id`        | UUID        | FK → `exhibitors.id` ON DELETE CASCADE                                                       |
| `contact_id`          | UUID        | FK → `contacts.id`                                                                           |
| `source`              | VARCHAR(50) | `qr_scan`, `chat`, `booth_visit`                                                             |
| `notes`               | TEXT        | Manual exhibitor notes                                                                       |
| `interest_level`      | VARCHAR(20) | **CHANGE type from INTEGER to VARCHAR(20)** — `cold`, `warm`, `hot`. **Migration required.** |
| `ai_intent`           | TEXT        | Extracted intent summary e.g. "Wants 50 units of X" — **ADD via migration**                  |
| `interaction_context` | VARCHAR(20) | `event_active`, `grace_period`, `independent` — **ADD via migration**                        |
| `follow_up_status`    | VARCHAR(20) | Default `new`                                                                                |
| `followed_up_at`      | TIMESTAMPTZ |                                                                                              |
| `created_at`          | TIMESTAMPTZ | Auto                                                                                         |

**Migrations required:**

1. `ALTER TABLE leads ALTER COLUMN interest_level TYPE VARCHAR(20)` (drop integer, add string enum).
2. `ALTER TABLE leads ADD COLUMN ai_intent TEXT`.
3. `ALTER TABLE leads ADD COLUMN interaction_context VARCHAR(20) NOT NULL DEFAULT 'event_active'`.

---

## 5. Required Migrations

Create a single migration file: `{timestamp}-AddEosColumnsToExistingTables.ts`

```typescript
// libs/database/src/migrations/{timestamp}-AddEosColumnsToExistingTables.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEosColumnsToExistingTables{timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. tickets: add payment_metadata and hype_card_id
    await queryRunner.query(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS payment_metadata JSONB,
        ADD COLUMN IF NOT EXISTS hype_card_id UUID REFERENCES generated_cards(id);
    `);

    // 2. leads: change interest_level from INTEGER to VARCHAR, add AI columns
    await queryRunner.query(`
      ALTER TABLE leads
        ALTER COLUMN interest_level TYPE VARCHAR(20) USING
          CASE
            WHEN interest_level >= 4 THEN 'hot'
            WHEN interest_level >= 2 THEN 'warm'
            ELSE 'cold'
          END,
        ADD COLUMN IF NOT EXISTS ai_intent TEXT,
        ADD COLUMN IF NOT EXISTS interaction_context VARCHAR(20) NOT NULL DEFAULT 'event_active';
    `);

    // 3. Index for lead lookups by exhibitor + interest
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_exhibitor ON leads(exhibitor_id);
      CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_id);
      CREATE INDEX IF NOT EXISTS idx_leads_interest ON leads(interest_level);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS payment_metadata,
        DROP COLUMN IF EXISTS hype_card_id;
    `);
    await queryRunner.query(`
      ALTER TABLE leads
        DROP COLUMN IF EXISTS interaction_context,
        DROP COLUMN IF EXISTS ai_intent,
        ALTER COLUMN interest_level TYPE INTEGER USING 0;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_leads_exhibitor;
      DROP INDEX IF EXISTS idx_leads_contact;
      DROP INDEX IF EXISTS idx_leads_interest;
    `);
  }
}
```

---

## 6. TypeORM Entities

All entities live in `libs/database/src/entities/` and must be registered in `libs/database/src/database.module.ts` and exported from `libs/database/src/entities/index.ts`.

### `event.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Organization } from "./organization.entity";
import { TicketType } from "./ticket-type.entity";
import { Exhibitor } from "./exhibitor.entity";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id" })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 100 })
  slug: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt: Date;

  @Column({ length: 50, default: "Africa/Nairobi" })
  timezone: string;

  @Column({ name: "venue_name", nullable: true, length: 255 })
  venueName: string;

  @Column({ name: "venue_address", nullable: true, type: "text" })
  venueAddress: string;

  @Column({ name: "is_virtual", default: false })
  isVirtual: boolean;

  @Column({ name: "virtual_url", nullable: true, type: "text" })
  virtualUrl: string;

  @Column({ name: "cover_image_url", nullable: true, type: "text" })
  coverImageUrl: string;

  /**
   * settings.hype_card_on_reg: boolean
   * settings.venue_map_config: { grid: { cols, rows }, slots: [{ id, x, y }] }
   */
  @Column({ type: "jsonb", default: "{}" })
  settings: Record<string, any>;

  @Column({ length: 20, default: "draft" })
  status: "draft" | "published" | "cancelled" | "completed";

  @Column({ name: "published_at", nullable: true, type: "timestamptz" })
  publishedAt: Date;

  @OneToMany(() => TicketType, (tt) => tt.event)
  ticketTypes: TicketType[];

  @OneToMany(() => Exhibitor, (e) => e.event)
  exhibitors: Exhibitor[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
```

### `ticket-type.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Event } from "./event.entity";
import { Ticket } from "./ticket.entity";

@Entity("ticket_types")
export class TicketType {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.ticketTypes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ length: 3, default: "KES" })
  currency: string;

  @Column({ name: "quantity_total", nullable: true, type: "int" })
  quantityTotal: number;

  @Column({ name: "quantity_sold", default: 0 })
  quantitySold: number;

  @Column({ name: "max_per_order", default: 10 })
  maxPerOrder: number;

  @Column({ name: "sales_start_at", nullable: true, type: "timestamptz" })
  salesStartAt: Date;

  @Column({ name: "sales_end_at", nullable: true, type: "timestamptz" })
  salesEndAt: Date;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "sort_order", default: 0 })
  sortOrder: number;

  @OneToMany(() => Ticket, (t) => t.ticketType)
  tickets: Ticket[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
```

### `ticket.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TicketType } from "./ticket-type.entity";
import { Contact } from "./contact.entity";
import { GeneratedCard } from "./generated-card.entity";

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ticket_type_id" })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, (tt) => tt.tickets)
  @JoinColumn({ name: "ticket_type_id" })
  ticketType: TicketType;

  @Column({ name: "contact_id" })
  contactId: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: "contact_id" })
  contact: Contact;

  @Column({ name: "ticket_code", length: 20, unique: true })
  ticketCode: string;

  @Column({ name: "qr_code_url", nullable: true, type: "text" })
  qrCodeUrl: string;

  @Column({ name: "holder_name", nullable: true, length: 255 })
  holderName: string;

  @Column({ name: "holder_email", nullable: true, length: 255 })
  holderEmail: string;

  @Column({ name: "holder_phone", nullable: true, length: 20 })
  holderPhone: string;

  @Column({
    name: "amount_paid",
    nullable: true,
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  amountPaid: number;

  @Column({ name: "payment_reference", nullable: true, length: 100 })
  paymentReference: string;

  @Column({ name: "payment_status", length: 20, default: "pending" })
  paymentStatus: "pending" | "completed" | "failed";

  /** { mpesa_receipt: string, checkout_request_id: string } */
  @Column({ name: "payment_metadata", nullable: true, type: "jsonb" })
  paymentMetadata: { mpesa_receipt?: string; checkout_request_id?: string };

  @Column({ name: "hype_card_id", nullable: true })
  hypeCardId: string;

  @ManyToOne(() => GeneratedCard, { nullable: true })
  @JoinColumn({ name: "hype_card_id" })
  hypeCard: GeneratedCard;

  @Column({ length: 20, default: "valid" })
  status: "valid" | "used" | "cancelled" | "refunded";

  @Column({ name: "checked_in_at", nullable: true, type: "timestamptz" })
  checkedInAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
```

### `exhibitor.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Event } from "./event.entity";
import { Organization } from "./organization.entity";
import { Lead } from "./lead.entity";

@Entity("exhibitors")
export class Exhibitor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.exhibitors, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  @Column({ name: "organization_id", nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ name: "logo_url", nullable: true, type: "text" })
  logoUrl: string;

  @Column({ name: "booth_number", nullable: true, length: 50 })
  boothNumber: string;

  /** { x: number, y: number, width: number, height: number } */
  @Column({ name: "booth_location", nullable: true, type: "jsonb" })
  boothLocation: { x: number; y: number; width: number; height: number };

  @Column({ name: "contact_name", nullable: true, length: 255 })
  contactName: string;

  @Column({ name: "contact_email", nullable: true, length: 255 })
  contactEmail: string;

  @Column({ name: "contact_phone", nullable: true, length: 20 })
  contactPhone: string;

  @Column({ type: "jsonb", default: "{}" })
  settings: Record<string, any>;

  @Column({ length: 20, default: "pending" })
  status: "pending" | "approved" | "rejected";

  @OneToMany(() => Lead, (l) => l.exhibitor)
  leads: Lead[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
```

### `lead.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Exhibitor } from "./exhibitor.entity";
import { Contact } from "./contact.entity";

@Entity("leads")
export class Lead {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "exhibitor_id" })
  exhibitorId: string;

  @ManyToOne(() => Exhibitor, (e) => e.leads, { onDelete: "CASCADE" })
  @JoinColumn({ name: "exhibitor_id" })
  exhibitor: Exhibitor;

  @Column({ name: "contact_id" })
  contactId: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: "contact_id" })
  contact: Contact;

  @Column({ nullable: true, length: 50 })
  source: "qr_scan" | "chat" | "booth_visit";

  @Column({ nullable: true, type: "text" })
  notes: string;

  /** AI-classified interest level (replaces the old INTEGER 1-5) */
  @Column({ name: "interest_level", length: 20, nullable: true })
  interestLevel: "cold" | "warm" | "hot";

  /** Extracted AI intent summary e.g. "Wants 50 units of product X" */
  @Column({ name: "ai_intent", nullable: true, type: "text" })
  aiIntent: string;

  /** Lifecycle context at time of capture */
  @Column({ name: "interaction_context", length: 20, default: "event_active" })
  interactionContext: "event_active" | "grace_period" | "independent";

  @Column({ name: "follow_up_status", length: 20, default: "new" })
  followUpStatus: string;

  @Column({ name: "followed_up_at", nullable: true, type: "timestamptz" })
  followedUpAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
```

---

## 7. Service Breakdown

### `EventService` (`apps/dashboard-api/src/eos-events/event.service.ts`)

- **`createEvent(organizationId: string, dto: CreateEventDto): Promise<Event>`** — Validates dates, creates the event row, initializes `settings.venue_map_config` to a default 10×10 grid.
- **`getVenueLayout(organizationId: string, eventId: string): Promise<VenueLayoutDto>`** — Fetches the event, reads `settings.venue_map_config`, returns it with exhibitor `booth_location` overlay for the frontend CSS Grid renderer.
- **`publishEvent(organizationId: string, eventId: string): Promise<Event>`** — Sets `status = 'published'` and `published_at = NOW()`. Validates that at least one `ticket_type` exists.

### `TicketService` (`apps/dashboard-api/src/eos-events/ticket.service.ts`)

- **`initiatePurchase(dto: InitiatePurchaseDto): Promise<Ticket>`** — Creates a `ticket_types` quantity lock, inserts a `tickets` row with `payment_status = 'pending'`, then calls `PaymentService.stkPush({ phone, amount, reference: ticket.id })`.
- **`processCallback(payload: MpesaCallbackPayload): Promise<void>`** — Validates the M-Pesa result. On success: updates `payment_status = 'completed'`, writes `payment_metadata`, generates `ticket_code` (nanoid 8-char), enqueues `HypeCardWorker` job if `event.settings.hype_card_on_reg === true`, then calls:
  ```typescript
  TriggerService.handle("TICKET_ISSUED", {
    tenantId: organizationId,
    contactId: ticket.contactId,
    payload: { ticketCode: ticket.ticketCode, qrCodeUrl: ticket.qrCodeUrl },
  });
  ```
  On failure: sets `payment_status = 'failed'`, releases quantity lock.

### `LeadService` (`apps/dashboard-api/src/eos-events/lead.service.ts`)

- **`captureLead(contactId: string, exhibitorId: string): Promise<Lead>`** — Entry point for QR scans. Creates a `leads` row with `source = 'qr_scan'`, `interest_level = 'cold'`, `interaction_context = 'event_active'`. Enqueues a `LeadProcessorWorker` job.
- **`analyzeIntent(leadId: string, transcript: string): Promise<void>`** — Called by the worker. Posts transcript to Central AI Brain. Receives `{ intent: string, interestLevel: 'cold'|'warm'|'hot' }`. Updates the `leads` row. If `interestLevel === 'hot'`, calls `notifyExhibitor(leadId)`.
- **`notifyExhibitor(leadId: string): Promise<void>`** — Loads the lead + exhibitor. Calls:
  ```typescript
  TriggerService.handle("HOT_LEAD_CAPTURED", {
    tenantId: exhibitor.organizationId,
    contactId: exhibitor.contactId, // exhibitor's own WhatsApp contact
    payload: { leadContactName, aiIntent, eventName },
  });
  ```

---

## 8. BullMQ Workers

### `LeadProcessorWorker` (`apps/dashboard-api/src/eos-events/workers/lead-processor.worker.ts`)

- **Queue name:** `eos-lead-processing`
- **Concurrency:** 5
- **Job payload:** `{ leadId: string, transcript: string }`
- **On process:** Calls `LeadService.analyzeIntent(leadId, transcript)`.
- **On failure:** Retries 3× with exponential backoff (30s base). Final failure sets `leads.interaction_context` unchanged — the lead remains `cold` and is not escalated.

### `HypeCardWorker` (`apps/dashboard-api/src/eos-events/workers/hypecard.worker.ts`)

- **Queue name:** `eos-hypecard-generation`
- **Concurrency:** 10
- **Job payload:** `{ ticketId: string, templateId: string, inputData: Record<string, any> }`
- **On process:** Calls the HypeCard renderer API. On success, inserts a `generated_cards` row, updates `tickets.hype_card_id`, debits wallet via `WalletService.debit({ organizationId, amount: 1, module: 'events', action: 'generate_hypecard', referenceId: ticketId })`.

---

## 9. The AI Lead Capture Pipeline

1. **Ingress:** User scans a Booth QR code. WhatsApp Gateway sends the payload to `LeadController.handleQrScan()`.
2. **Create Lead:** `LeadService.captureLead()` creates the `leads` row and enqueues `LeadProcessorWorker`.
3. **Conversation Flow:** The AI Brain (via the `conversations` module) asks 2–3 qualifying questions. The full transcript is stored in `conversations` → `messages`.
4. **Worker Picks Up:** `LeadProcessorWorker` calls `LeadService.analyzeIntent(leadId, transcript)`.
5. **Classification:** AI returns `{ intent, interestLevel }`. Lead row is updated.
6. **Hot Lead Escalation:** If `hot`, `TriggerService.handle('HOT_LEAD_CAPTURED')` fires a campaign message to the exhibitor's WhatsApp.
7. **Viral Loop:** A HypeCard job is enqueued: _"I just visited [Exhibitor Name] at [Event]!"_ — sent to the lead's contact via the Campaigns module.

---

## 10. The Registration & Payment Pipeline

1. **Request:** Attendee submits registration form (Event Landing Page → `POST /events/:eventId/tickets/purchase`).
2. **Lock:** `TicketService.initiatePurchase()` creates a `tickets` row with `payment_status = 'pending'`. `ticket_types.quantity_sold` is incremented optimistically.
3. **STK Push:** `PaymentService.stkPush()` triggers M-Pesa prompt on attendee's phone.
4. **Async Wait:** Frontend polls `GET /tickets/:id/status`.
5. **M-Pesa Callback:** `POST /billing/mpesa/callback` → `TicketService.processCallback()`.
6. **Fulfillment (Success):**
   - `payment_status = 'completed'`, `payment_metadata` written.
   - `ticket_code` generated (nanoid), `qr_code_url` generated.
   - `HypeCardWorker` enqueued if `hype_card_on_reg = true`.
   - `TriggerService.handle('TICKET_ISSUED', ...)` → Campaigns module sends ticket via WhatsApp.
7. **Fulfillment (Failure):**
   - `payment_status = 'failed'`.
   - `ticket_types.quantity_sold` decremented.

---

## 11. Booth Grid Mapping Logic

- The Organizer sets `events.settings.venue_map_config = { grid: { cols: 10, rows: 10 }, slots: [] }` on event creation.
- Each `Exhibitor` row stores `booth_location: { x, y, width, height }` as cell indices.
- `EventService.getVenueLayout()` merges the grid config with all approved exhibitors' `booth_location` values and returns a `VenueLayoutDto`.
- The Next.js frontend renders a CSS Grid using this data. **The backend stores only coordinates — all drag-and-drop state is managed client-side before the final PATCH saves the JSON.**

---

## 12. API Endpoints

| Method  | Path                                | Handler                             | Description                       |
| ------- | ----------------------------------- | ----------------------------------- | --------------------------------- |
| `POST`  | `/events`                           | `EventController.create`            | Create a new event                |
| `GET`   | `/events/:id`                       | `EventController.findOne`           | Get event detail                  |
| `PATCH` | `/events/:id`                       | `EventController.update`            | Update event (includes venue map) |
| `POST`  | `/events/:id/publish`               | `EventController.publish`           | Publish event                     |
| `GET`   | `/events/:id/venue-layout`          | `EventController.getVenueLayout`    | Get grid + booth overlay          |
| `POST`  | `/events/:eventId/ticket-types`     | `TicketTypeController.create`       | Add a ticket type                 |
| `POST`  | `/events/:eventId/tickets/purchase` | `TicketController.initiatePurchase` | Start M-Pesa payment              |
| `GET`   | `/tickets/:id/status`               | `TicketController.getStatus`        | Poll payment status               |
| `POST`  | `/events/:eventId/exhibitors`       | `ExhibitorController.create`        | Onboard an exhibitor              |
| `GET`   | `/events/:eventId/exhibitors`       | `ExhibitorController.list`          | List exhibitors (organizer)       |
| `GET`   | `/exhibitors/:id/leads`             | `LeadController.list`               | List leads (exhibitor-scoped)     |
| `POST`  | `/leads/qr-scan`                    | `LeadController.handleQrScan`       | Entry point for booth QR scans    |

All endpoints require a JWT bearer token. `organization_id` is extracted from the token payload — it is never accepted as a query/body param.

---

## 13. DTOs

### `CreateEventDto` (`dto/create-event.dto.ts`)

```typescript
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsObject,
} from "class-validator";

export class CreateEventDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @IsOptional()
  @IsString()
  virtualUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  /** Partial settings — merged with defaults on creation */
  @IsOptional()
  @IsObject()
  settings?: {
    hype_card_on_reg?: boolean;
    venue_map_config?: {
      grid: { cols: number; rows: number };
      slots: Array<{ id: string; x: number; y: number }>;
    };
  };
}
```

### `InitiatePurchaseDto` (`dto/initiate-purchase.dto.ts`)

```typescript
import { IsUUID, IsString, IsOptional, IsEmail } from "class-validator";

export class InitiatePurchaseDto {
  @IsUUID()
  ticketTypeId: string;

  @IsString()
  holderPhone: string;

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsEmail()
  holderEmail?: string;
}
```

---

## 14. Campaign Integration (TriggerService)

The Events module fires two trigger types handled by the Campaigns module `TriggerService`. Both use `type: 'module_initiated'` campaigns and expect pre-configured templates to exist.

| Trigger Name        | Fired By                        | Template Variables                                          |
| ------------------- | ------------------------------- | ----------------------------------------------------------- |
| `TICKET_ISSUED`     | `TicketService.processCallback` | `ticketCode`, `qrCodeUrl`, `eventName`, `holderName`        |
| `HOT_LEAD_CAPTURED` | `LeadService.notifyExhibitor`   | `leadContactName`, `aiIntent`, `eventName`, `exhibitorName` |

**Trigger call signature** (matches `TriggerService` in `campaigns/trigger.service.ts`):

```typescript
await this.triggerService.handle(triggerType: string, {
  tenantId: string;        // organization_id of the recipient's org
  contactId: string;       // contacts.id of the WhatsApp recipient
  payload: Record<string, any>; // template variable substitutions
});
```

---

## 15. Token / Billing Integration

Token debits are made via `WalletService` (Billing module) for the following actions:

| Action                           | Tokens              | When                                          |
| -------------------------------- | ------------------- | --------------------------------------------- |
| `generate_hypecard` (ticket)     | 1                   | On `HypeCardWorker` success                   |
| `generate_hypecard` (lead viral) | 1                   | On `HypeCardWorker` success                   |
| WhatsApp message delivery        | Per campaign config | Managed by Campaigns module — not called here |

```typescript
await this.walletService.debit({
  organizationId,
  amount: 1,
  module: "events",
  action: "generate_hypecard",
  referenceId: ticketId, // or leadId
});
```

---

## 16. File Inventory

| File                                                                        | Responsibility                                                                                                                           |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/dashboard-api/src/eos-events/events.module.ts`                        | NestJS module: registers services, workers, BullMQ queues                                                                                |
| `apps/dashboard-api/src/eos-events/event.controller.ts`                     | REST endpoints for events, venue layout                                                                                                  |
| `apps/dashboard-api/src/eos-events/ticket.controller.ts`                    | REST endpoints for ticket purchase + status                                                                                              |
| `apps/dashboard-api/src/eos-events/exhibitor.controller.ts`                 | REST endpoints for exhibitor onboarding                                                                                                  |
| `apps/dashboard-api/src/eos-events/lead.controller.ts`                      | REST endpoints for QR scan + lead listing                                                                                                |
| `apps/dashboard-api/src/eos-events/event.service.ts`                        | Event CRUD and venue layout logic                                                                                                        |
| `apps/dashboard-api/src/eos-events/ticket.service.ts`                       | Purchase initiation and M-Pesa callback handling                                                                                         |
| `apps/dashboard-api/src/eos-events/lead.service.ts`                         | Lead capture, AI analysis, exhibitor notification                                                                                        |
| `apps/dashboard-api/src/eos-events/workers/lead-processor.worker.ts`        | BullMQ worker: AI intent analysis                                                                                                        |
| `apps/dashboard-api/src/eos-events/workers/hypecard.worker.ts`              | BullMQ worker: HypeCard generation + debit                                                                                               |
| `apps/dashboard-api/src/eos-events/dto/create-event.dto.ts`                 | Event creation validation                                                                                                                |
| `apps/dashboard-api/src/eos-events/dto/initiate-purchase.dto.ts`            | Ticket purchase validation                                                                                                               |
| `libs/database/src/entities/event.entity.ts`                                | TypeORM entity                                                                                                                           |
| `libs/database/src/entities/ticket-type.entity.ts`                          | TypeORM entity                                                                                                                           |
| `libs/database/src/entities/ticket.entity.ts`                               | TypeORM entity                                                                                                                           |
| `libs/database/src/entities/exhibitor.entity.ts`                            | TypeORM entity                                                                                                                           |
| `libs/database/src/entities/lead.entity.ts`                                 | TypeORM entity                                                                                                                           |
| `libs/database/src/migrations/{timestamp}-AddEosColumnsToExistingTables.ts` | Adds `payment_metadata`, `hype_card_id` to `tickets`; adds `ai_intent`, `interaction_context`, migrates `interest_level` type in `leads` |

---

## 17. Module Registration Checklist

When wiring this module into the app, the code agent must update the following files:

1. **`libs/database/src/entities/index.ts`** — Export `Event`, `TicketType`, `Ticket`, `Exhibitor`, `Lead`.
2. **`libs/database/src/database.module.ts`** — Add all 5 entities to the `entities` array.
3. **`apps/dashboard-api/src/dashboard.module.ts`** — Import `EosEventsModule`.
4. **`libs/database/src/migrations/index.ts`** (if it exists) — Register `AddEosColumnsToExistingTables` migration.
5. Run `npm run db:migrate` via the Docker entrypoint before app start.
