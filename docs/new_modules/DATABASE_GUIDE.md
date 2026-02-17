# **CHATNATION CRM — DATABASE GUIDE**

**Understanding How the Database Powers the System**

---

## **TABLE OF CONTENTS**

1. [How to Read This Guide](#how-to-read-this-guide)
2. [Core System Tables](#1-core-system-tables)
3. [Events Module Tables](#2-events-module-tables)
4. [Surveys Module Tables](#3-surveys-module-tables)
5. [Content Module Tables](#4-content-module-tables)
6. [HypeCard Module Tables](#5-hypecard-module-tables)
7. [AI & Knowledge Base Tables](#6-ai--knowledge-base-tables)
8. [Complete Relationship Map](#7-complete-relationship-map)

---

## **HOW TO READ THIS GUIDE**

Each table section explains:
- **What it stores** — The purpose of this table
- **System feature** — Which part of the app uses this table
- **Parent tables** — Tables this one depends on (foreign keys pointing UP)
- **Child tables** — Tables that depend on this one (foreign keys pointing HERE)
- **Key relationships** — Why these connections exist

**Relationship Types:**
- `1:1` — One record relates to exactly one other record
- `1:N` — One parent has many children (e.g., one event has many tickets)
- `N:M` — Many-to-many through a junction table

---

## **1. CORE SYSTEM TABLES**

These tables form the foundation. Every other table connects back to these.

---

### **organizations**

| What it stores | System feature |
|----------------|----------------|
| Businesses using the platform (event organizers, radio stations, churches, etc.) | Multi-tenancy: every piece of data belongs to one organization |

**This is the ROOT table** — Almost every other table has `organization_id` pointing here.

```
organizations (1) ──────► (N) users
                 ──────► (N) contacts  
                 ──────► (N) events
                 ──────► (N) surveys
                 ──────► (1) wallets
                 ──────► (N) knowledge_bases
                 ... and more
```

**Why it matters:** When a user logs in, we know their `organization_id`. Every query automatically filters to show only their organization's data (Row-Level Security).

---

### **users**

| What it stores | System feature |
|----------------|----------------|
| Admin users who manage the dashboard (NOT WhatsApp end-users) | Authentication, team management |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `organizations` | N:1 | Each user belongs to one organization |

| Child | Relationship | Why |
|-------|--------------|-----|
| `user_roles` | 1:N | Users can have multiple roles |
| `refresh_tokens` | 1:N | Track active login sessions |
| `events` (created_by) | 1:N | Track who created what |

**Example:** Acme Events has 5 staff members. Each is a `user` in the system with different roles (admin, editor, viewer).

---

### **roles** & **user_roles**

| What it stores | System feature |
|----------------|----------------|
| Permission sets (admin, editor, viewer) and which users have which roles | Role-Based Access Control (RBAC) |

```
roles (1) ◄────── (N) user_roles (N) ──────► (1) users
```

**Why two tables?** A user can have multiple roles (e.g., "Admin" for events, "Viewer" for billing). This N:M relationship requires a junction table.

---

### **wallets**

| What it stores | System feature |
|----------------|----------------|
| Token balance for each organization (prepaid credits) | Billing, pay-as-you-go model |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `organizations` | 1:1 | Each organization has exactly ONE wallet |

| Child | Relationship | Why |
|-------|--------------|-----|
| `token_transactions` | 1:N | Track every credit/debit |
| `token_purchases` | 1:N | Track payment history |
| `billing_alerts` | 1:N | Low balance notifications |

**Example:** Organization signs up → wallet created with 0 balance → they purchase 2000 tokens → wallet.balance = 2000 → they send a broadcast (costs 50 tokens) → transaction recorded, balance = 1950.

---

### **token_transactions**

| What it stores | System feature |
|----------------|----------------|
| Every token movement (purchases, debits, refunds) | Billing audit trail, usage analytics |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `wallets` | N:1 | Every transaction belongs to one wallet |

**Key columns:**
- `type`: 'purchase', 'debit', 'refund', 'reserve', 'release'
- `module`: 'events', 'surveys', 'hypecard', 'content'
- `action`: 'generate_hypecard', 'send_broadcast', 'ai_query'
- `reference_id`: Links to the thing that consumed tokens (survey_id, broadcast_id, etc.)

**Example:** User generates a HypeCard → transaction created: `{type: 'debit', amount: 3, module: 'hypecard', action: 'generate_card', reference_id: 'card-uuid'}`

---

### **contacts**

| What it stores | System feature |
|----------------|----------------|
| WhatsApp end-users who interact with the bot | CRM, audience management |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `organizations` | N:1 | Contacts are scoped to the organization |

| Child | Relationship | Why |
|-------|--------------|-----|
| `conversations` | 1:N | Each contact can have multiple chat sessions |
| `tickets` | 1:N | A contact can buy multiple event tickets |
| `survey_responses` | 1:N | A contact can respond to multiple surveys |
| `leads` | 1:N | A contact can be a lead for multiple exhibitors |
| `participants` | 1:N | A contact can attend multiple events |

**This is the "customer" table.** When someone messages the WhatsApp bot, we look them up by phone number. If they don't exist, we create a new contact.

**Example:** +254712345678 messages the bot → we find/create contact → they ask about an event → we create a conversation → they register → we create a participant record → they buy a ticket → we create a ticket record.

---

### **conversations** & **messages**

| What it stores | System feature |
|----------------|----------------|
| Chat sessions and individual WhatsApp messages | WhatsApp inbox, AI chatbot state |

```
contacts (1) ──────► (N) conversations (1) ──────► (N) messages
```

| Key columns in `conversations` | Purpose |
|-------------------------------|---------|
| `current_state` | State machine: 'idle', 'survey_in_progress', 'purchasing_ticket' |
| `state_data` | JSON context: which survey, which question, collected answers |
| `current_module` | Which module is handling this: 'events', 'surveys', etc. |

**Why state tracking?** WhatsApp conversations are multi-step. User says "I want to buy a ticket" → bot asks "which event?" → user picks → bot asks "how many?" → etc. We need to remember where we are in the flow.

**Example flow:**
1. User: "Hi" → conversation.current_state = 'idle'
2. User: "Take survey" → conversation.current_state = 'survey_in_progress', state_data = {survey_id: '...', current_question: 1}
3. User: "Very satisfied" → state_data.current_question = 2
4. User finishes → current_state = 'idle', survey_response created

---

## **2. EVENTS MODULE TABLES**

These tables power the Event Operating System (EOS).

---

### **events**

| What it stores | System feature |
|----------------|----------------|
| Events created by organizers | Event management, ticketing |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `organizations` | N:1 | Each event belongs to one organization |
| `venues` | N:1 | Optional: event can be at a saved venue |

| Child | Relationship | Why |
|-------|--------------|-----|
| `event_sessions` | 1:N | An event has multiple sessions/agenda items |
| `ticket_types` | 1:N | An event has multiple ticket tiers |
| `exhibitors` | 1:N | An event can have multiple exhibitors |
| `participants` | 1:N | Many people register for the event |
| `surveys` | 1:N | Feedback surveys linked to the event |
| `polls` | 1:N | Live polls during the event |

**Example:** TechExpo 2024 (event) has:
- 3 ticket types (Early Bird, Regular, VIP)
- 2 days of sessions (15 sessions total)
- 50 exhibitors
- 500 participants
- 1 feedback survey

---

### **ticket_types** → **tickets**

| Table | What it stores |
|-------|----------------|
| `ticket_types` | Ticket products for sale (VIP @ KES 5000, Regular @ KES 2000) |
| `tickets` | Actual purchased tickets with QR codes |

```
events (1) ──► (N) ticket_types (1) ──► (N) tickets ◄── (N:1) contacts
```

**Why two tables?**
- `ticket_types` = The product definition (price, quantity available)
- `tickets` = Individual purchases (who bought it, QR code, check-in status)

**Example:**
- ticket_types: "VIP Pass" (100 available, KES 5000 each)
- tickets: John Doe bought 1 VIP Pass, ticket_code = "TECH-VIP-ABC123"

---

### **participants**

| What it stores | System feature |
|----------------|----------------|
| Links contacts to events they registered for | Event registration, attendance tracking |

| Parent | Relationship | Why |
|--------|--------------|-----|
| `events` | N:1 | Participant registered for this event |
| `contacts` | N:1 | The person who registered |

**Why separate from tickets?** 
- Free events have participants but no tickets
- One person can register AND buy a ticket (different concepts)
- Tracks attendance even if they entered free

```
contacts (1) ──► (N) participants ◄── (N:1) events
              └──► (N) tickets
```

---

### **exhibitors** → **exhibitor_products** → **leads**

| Table | What it stores |
|-------|----------------|
| `exhibitors` | Companies exhibiting at an event |
| `exhibitor_products` | Products displayed by each exhibitor |
| `leads` | Contacts captured by each exhibitor |

```
events (1) ──► (N) exhibitors (1) ──► (N) exhibitor_products
                              (1) ──► (N) leads ◄── (N:1) contacts
```

**Example:** At TechExpo:
- Exhibitor: "CloudTech Ltd" (booth #A15)
  - Products: "Cloud Server", "CDN Service"
  - Leads: 45 people scanned their booth QR code

**Why leads link to contacts?** When someone scans an exhibitor's QR, we create a lead linked to their contact. The exhibitor can follow up, but the contact data belongs to the organization.

---

### **event_sessions** → **speakers** → **session_speakers**

| Table | What it stores |
|-------|----------------|
| `event_sessions` | Agenda items (talks, workshops, breaks) |
| `speakers` | Speaker profiles (reusable across events) |
| `session_speakers` | Which speakers present which sessions |

```
events (1) ──► (N) event_sessions (N) ◄──► (N) speakers
                                    └─via session_speakers
```

**Why N:M?** A session can have multiple speakers (panel), and a speaker can present multiple sessions.

---

## **3. SURVEYS MODULE TABLES**

Powers the Universal Survey & Insight (USI) Engine.

---

### **surveys** → **survey_responses**

| Table | What it stores |
|-------|----------------|
| `surveys` | Survey definitions (questions, settings, logic) |
| `survey_responses` | Individual submissions with answers |

```
organizations (1) ──► (N) surveys (1) ──► (N) survey_responses ◄── (N:1) contacts
                                   │
                                   └──► event_id (optional)
```

| Key columns in `surveys` | Purpose |
|-------------------------|---------|
| `questions` (JSONB) | Flexible question schema (text, choice, rating, audio) |
| `logic` (JSONB) | Skip logic and branching rules |
| `whatsapp_keywords` | Keywords that trigger this survey |

| Key columns in `survey_responses` | Purpose |
|----------------------------------|---------|
| `answers` (JSONB) | Flexible answer storage |
| `status` | 'in_progress', 'completed', 'abandoned' |
| `sentiment_score` | AI-computed sentiment (-1 to +1) |
| `ai_summary` | AI-generated summary of open-ended responses |

**Example flow:**
1. User texts "feedback" (keyword triggers survey)
2. survey_response created: status = 'in_progress', answers = {}
3. User answers Q1 → answers = {q1: "John"}
4. User answers Q2 → answers = {q1: "John", q2: "Very Satisfied"}
5. Survey complete → status = 'completed', AI analyzes sentiment

---

### **response_attachments**

| What it stores | System feature |
|----------------|----------------|
| Media files from survey responses (voice notes, images) | Multimedia surveys |

```
survey_responses (1) ──► (N) response_attachments
```

**Example:** Survey asks "Record a voice note about your experience" → User sends audio → stored in response_attachments with transcription.

---

## **4. CONTENT MODULE TABLES**

Powers the Multi-Purpose Content & Engagement (MPCE) Engine.

---

### **programs** → **content_items**

| Table | What it stores |
|-------|----------------|
| `programs` | Content series (Daily Devotional, Weekly Newsletter) |
| `content_items` | Individual pieces of content |

```
organizations (1) ──► (N) programs (1) ──► (N) content_items
                 └──────────────────────► (N) content_items (standalone)
```

**Example:** 
- Program: "Morning Motivation" (daily at 6 AM)
  - Day 1: "Start your day with gratitude..."
  - Day 2: "Today's affirmation..."
  - etc.

| Key columns in `content_items` | Purpose |
|-------------------------------|---------|
| `content_type` | 'text', 'image', 'audio', 'video', 'poll' |
| `scheduled_at` | When to send |
| `sequence_number` | Order in the program |

---

### **broadcasts** → **broadcast_recipients**

| Table | What it stores |
|-------|----------------|
| `broadcasts` | Mass message campaigns |
| `broadcast_recipients` | Individual send status per contact |

```
organizations (1) ──► (N) broadcasts (1) ──► (N) broadcast_recipients ◄── (N:1) contacts
```

**Why track recipients individually?** WhatsApp messages can fail for specific contacts. We need to know: sent? delivered? read? failed? For each person.

**Example:**
- Broadcast: "Event reminder" to 5000 people
- broadcast_recipients: 5000 records
  - 4800 status = 'delivered'
  - 150 status = 'sent' (not yet delivered)
  - 50 status = 'failed' (invalid numbers)

---

### **polls** → **poll_votes**

| Table | What it stores |
|-------|----------------|
| `polls` | Poll questions with options |
| `poll_votes` | Individual votes |

```
organizations (1) ──► (N) polls (1) ──► (N) poll_votes ◄── (N:1) contacts
```

**Example:** Live poll during event session:
- Poll: "What topic should we cover next?"
- Options: ["AI", "Cloud", "Security"]
- poll_votes: 200 records showing who voted for what

---

### **program_subscriptions**

| What it stores | System feature |
|----------------|----------------|
| Which contacts are subscribed to which programs | Content delivery targeting |

```
programs (1) ──► (N) program_subscriptions ◄── (N:1) contacts
```

**Example:** 1500 people subscribed to "Daily Devotional" → Every morning, content_item is sent to these 1500.

---

## **5. HYPECARD MODULE TABLES**

Powers the Viral Digital Card Generator.

---

### **hypecard_templates** → **generated_cards**

| Table | What it stores |
|-------|----------------|
| `hypecard_templates` | Visual template definitions (layers, variables) |
| `generated_cards` | Cards generated for users |

```
organizations (1) ──► (N) hypecard_templates (1) ──► (N) generated_cards ◄── (N:1) contacts
                                             └──► event_id (optional)
```

| Key columns in `hypecard_templates` | Purpose |
|------------------------------------|---------|
| `layers` (JSONB) | Visual elements: images, text, QR codes |
| `variables` (JSONB) | User inputs: name, photo, title |
| `width`, `height` | Canvas dimensions (e.g., 1080x1080) |

| Key columns in `generated_cards` | Purpose |
|---------------------------------|---------|
| `input_data` (JSONB) | The values user provided |
| `image_url` | Final generated image |
| `share_code` | Short code for sharing (e.g., "ABC123") |
| `view_count`, `share_count` | Viral metrics |

**Example flow:**
1. Template: "TechExpo Speaker Card" (photo + name + title + event logo)
2. User sends photo and name via WhatsApp
3. generated_cards record created with input_data = {name: "Jane", photo: "..."}
4. Playwright renders the image
5. image_url saved, sent to user
6. User shares → view_count increments

---

### **card_views**

| What it stores | System feature |
|----------------|----------------|
| Anonymous view tracking for shared cards | Viral analytics |

```
generated_cards (1) ──► (N) card_views
```

**Why track views?** To measure virality. If a card is viewed 1000 times, it's being shared.

---

## **6. AI & KNOWLEDGE BASE TABLES**

Powers RAG (Retrieval-Augmented Generation) for smart responses.

---

### **knowledge_bases** → **kb_documents** → **embeddings**

| Table | What it stores |
|-------|----------------|
| `knowledge_bases` | Collections of knowledge (e.g., "Product FAQ") |
| `kb_documents` | Source documents |
| `embeddings` | Vector chunks for AI search |

```
organizations (1) ──► (N) knowledge_bases (1) ──► (N) kb_documents (1) ──► (N) embeddings
```

**How it works:**
1. Admin uploads a document (PDF, text)
2. kb_documents record created
3. Document split into chunks (500 words each)
4. Each chunk → OpenAI embedding API → 1536-dimension vector
5. embeddings records created

**When user asks a question:**
1. Question → embedding vector
2. Search embeddings table for similar vectors (cosine similarity)
3. Return top 5 relevant chunks
4. Feed chunks to GPT → generate answer

---

### **faq_items**

| What it stores | System feature |
|----------------|----------------|
| Structured Q&A pairs with embeddings | Fast FAQ retrieval |

```
knowledge_bases (1) ──► (N) faq_items
```

**Why separate from documents?** FAQs are structured (exact Q → exact A). Documents are unstructured text. FAQs get faster, more accurate retrieval.

---

### **rag_query_logs**

| What it stores | System feature |
|----------------|----------------|
| All AI queries and responses | Analytics, improvement |

```
organizations (1) ──► (N) rag_query_logs
conversations (1) ──► (N) rag_query_logs
```

**Why log everything?** To improve the AI:
- Which questions are asked most?
- Which responses were marked "not helpful"?
- Where do we need more knowledge?

---

## **7. COMPLETE RELATIONSHIP MAP**

### **The Full Picture**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 ORGANIZATIONS                                        │
│                              (Multi-tenant root)                                     │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
   ┌─────────┐                    ┌──────────┐                    ┌──────────┐
   │  USERS  │                    │ CONTACTS │                    │ WALLETS  │
   │ (staff) │                    │(WhatsApp)│                    │(billing) │
   └────┬────┘                    └────┬─────┘                    └────┬─────┘
        │                              │                               │
        │                    ┌─────────┼─────────┐                     │
        │                    │         │         │                     ▼
        │                    ▼         ▼         ▼              token_transactions
        │            conversations  tickets   survey_responses   token_purchases
        │                    │         ▲         ▲
        │                    ▼         │         │
        │               messages       │         │
        │                              │         │
        │         ┌────────────────────┴─────────┴────────────────────┐
        │         │                                                    │
        ▼         ▼                                                    ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  ┌─────────────┐
   │     EVENTS      │    │    SURVEYS      │    │    CONTENT      │  │  HYPECARDS  │
   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘  └──────┬──────┘
            │                      │                      │                  │
    ┌───────┼───────┐              │              ┌───────┼───────┐          │
    │       │       │              │              │       │       │          │
    ▼       ▼       ▼              ▼              ▼       ▼       ▼          ▼
 sessions tickets exhibitors   responses      programs broadcasts polls   templates
    │       │       │              │              │       │       │          │
    ▼       │       ▼              ▼              │       ▼       ▼          ▼
 speakers   │     leads      attachments   subscriptions recipients votes  cards
            │       │                                                        │
            └───────┴────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ KNOWLEDGE BASES │
                               └────────┬────────┘
                                        │
                               ┌────────┼────────┐
                               ▼        ▼        ▼
                          documents  faq_items  embeddings
                               │                    │
                               └────────┬───────────┘
                                        ▼
                                  rag_query_logs
```

---

### **Table Count by Module**

| Module | Tables | Purpose |
|--------|--------|---------|
| **Core** | 18 | Organizations, users, contacts, billing, messaging |
| **Events** | 15 | Events, tickets, exhibitors, leads |
| **Surveys** | 5 | Surveys, responses, analytics |
| **Content** | 7 | Programs, broadcasts, polls |
| **HypeCards** | 3 | Templates, generated cards |
| **AI/RAG** | 5 | Knowledge bases, embeddings |
| **Total** | **53** | Complete platform |

---

### **Key Takeaways**

1. **Everything starts at `organizations`** — Multi-tenancy is baked in
2. **`contacts` are your customers** — Every WhatsApp user becomes a contact
3. **`conversations` track state** — Multi-step flows are handled here
4. **`wallets` power billing** — Every action costs tokens, tracked in transactions
5. **Module tables branch from core** — Events, surveys, content all connect back to organizations and contacts
6. **JSONB enables flexibility** — Survey questions, template layers, etc. don't need rigid schemas

---

_Document created for ChatNation CRM | December 2024_
