# **CHATNATION CRM — DATABASE SCHEMA DESIGN**

**Version:** 1.0  
**Database:** PostgreSQL 16 with pgvector extension

---

## **TABLE OF CONTENTS**

1. [Design Principles](#1-design-principles)
2. [Schema Overview](#2-schema-overview)
3. [Core Tables](#3-core-tables)
4. [Module Tables](#4-module-tables)
5. [Relationships Diagram](#5-relationships-diagram)
6. [Indexes & Performance](#6-indexes--performance)
7. [Migration Strategy](#7-migration-strategy)

---

## **1. DESIGN PRINCIPLES**

### **1.1 Multi-Tenancy**

All tenant data is isolated using `organization_id` on every table with Row-Level Security (RLS).

### **1.2 Naming Conventions**

- **Tables**: lowercase, plural, snake_case (`organizations`, `event_tickets`)
- **Columns**: lowercase, snake_case (`created_at`, `organization_id`)
- **Primary Keys**: `id` (UUID)
- **Foreign Keys**: `{table_singular}_id` (`organization_id`, `event_id`)
- **Timestamps**: All tables have `created_at` and `updated_at`

### **1.3 Data Types**

| Type | Use For |
|------|---------|
| `UUID` | Primary keys, foreign keys |
| `TEXT` | Variable-length strings |
| `VARCHAR(n)` | Fixed-max strings (phone, email) |
| `JSONB` | Flexible schemas (survey questions, settings) |
| `TIMESTAMPTZ` | All datetime fields |
| `INTEGER` | Counts, tokens, small numbers |
| `BIGINT` | Large counters |
| `DECIMAL(10,2)` | Money |
| `BOOLEAN` | Flags |
| `vector(1536)` | OpenAI embeddings |

---

## **2. SCHEMA OVERVIEW**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│  organizations ─┬─► users ─► user_roles                         │
│                 ├─► wallets ─► token_transactions                │
│                 ├─► api_keys                                     │
│                 └─► knowledge_bases ─► documents ─► embeddings   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MODULE I: EVENTS                              │
├─────────────────────────────────────────────────────────────────┤
│  events ─┬─► sessions ─► speakers                                │
│          ├─► ticket_types ─► tickets ─► check_ins               │
│          ├─► exhibitors ─► products, leads, exhibitor_staff     │
│          ├─► participants                                        │
│          └─► venues ─► booth_locations                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MODULE II: SURVEYS                            │
├─────────────────────────────────────────────────────────────────┤
│  surveys ─► questions ─► question_options                        │
│         └─► survey_responses ─► response_items                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MODULE III: CONTENT                           │
├─────────────────────────────────────────────────────────────────┤
│  programs ─► segments ─► content_items                           │
│  broadcasts ─► broadcast_recipients                              │
│  polls ─► poll_options ─► poll_votes                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MODULE IV: HYPECARDS                          │
├─────────────────────────────────────────────────────────────────┤
│  hypecard_templates ─► template_layers                           │
│                     └─► generated_cards                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATIONS & MESSAGING                     │
├─────────────────────────────────────────────────────────────────┤
│  contacts ─► conversations ─► messages                           │
│          └─► conversation_states                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## **3. CORE TABLES**

### **3.1 Organizations**

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50), -- 'event_organizer', 'exhibitor', 'radio', 'church', etc.
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- WhatsApp
    whatsapp_phone_id VARCHAR(50),
    whatsapp_business_id VARCHAR(50),
    whatsapp_access_token TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}', -- logo_url, colors, etc.
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'trial'
    trial_ends_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
```

### **3.2 Users**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Auth
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

### **3.3 Roles & Permissions**

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]', -- ['events.create', 'surveys.view']
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
```

### **3.4 Wallets & Billing**

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
    
    balance INTEGER NOT NULL DEFAULT 0,
    reserved_balance INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased BIGINT DEFAULT 0,
    lifetime_consumed BIGINT DEFAULT 0,
    
    -- Auto-refill
    low_balance_threshold INTEGER DEFAULT 100,
    auto_refill_enabled BOOLEAN DEFAULT FALSE,
    auto_refill_amount INTEGER,
    
    currency VARCHAR(3) DEFAULT 'KES',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    
    type VARCHAR(20) NOT NULL, -- 'purchase', 'debit', 'refund', 'reserve', 'release'
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Context
    module VARCHAR(50), -- 'events', 'surveys', 'content', 'hypecard'
    action VARCHAR(100), -- 'generate_hypecard', 'send_broadcast'
    reference_id UUID,
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_token_tx_wallet ON token_transactions(wallet_id);
CREATE INDEX idx_token_tx_created ON token_transactions(created_at);

CREATE TABLE token_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    
    tokens INTEGER NOT NULL,
    bonus_tokens INTEGER DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    payment_method VARCHAR(20), -- 'mpesa', 'card', 'bank'
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### **3.5 Contacts (End Users)**

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Identity
    phone VARCHAR(20) NOT NULL,
    whatsapp_id VARCHAR(50),
    name VARCHAR(255),
    email VARCHAR(255),
    
    -- Profile
    profile JSONB DEFAULT '{}', -- custom fields
    tags TEXT[] DEFAULT '{}',
    
    -- Engagement
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    
    -- Opt-in
    opted_in BOOLEAN DEFAULT TRUE,
    opted_in_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, phone)
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_whatsapp ON contacts(whatsapp_id);
```

### **3.6 Conversations & Messages**

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    -- State
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'archived'
    current_state VARCHAR(50), -- 'idle', 'survey_q3', 'ticket_payment'
    state_data JSONB DEFAULT '{}',
    
    -- Context
    current_module VARCHAR(50), -- 'events', 'surveys', etc.
    current_reference_id UUID, -- event_id, survey_id, etc.
    
    -- Timing
    last_message_at TIMESTAMPTZ,
    last_user_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    
    -- Direction
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    
    -- Content
    type VARCHAR(20) NOT NULL, -- 'text', 'image', 'audio', 'video', 'document'
    content TEXT,
    media_url TEXT,
    
    -- WhatsApp
    wa_message_id VARCHAR(100),
    wa_status VARCHAR(20), -- 'sent', 'delivered', 'read', 'failed'
    
    -- AI
    intent VARCHAR(100),
    entities JSONB,
    
    -- Tokens
    tokens_consumed INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

---

## **4. MODULE TABLES**

### **4.1 Module I: Events**

```sql
-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100),
    description TEXT,
    
    -- Dates
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    
    -- Location
    venue_name VARCHAR(255),
    venue_address TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_url TEXT,
    
    -- Media
    cover_image_url TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'cancelled', 'completed'
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_dates ON events(starts_at, ends_at);
CREATE INDEX idx_events_status ON events(status);

-- Ticket Types
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'KES',
    
    quantity_total INTEGER,
    quantity_sold INTEGER DEFAULT 0,
    
    -- Limits
    max_per_order INTEGER DEFAULT 10,
    sales_start_at TIMESTAMPTZ,
    sales_end_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets (Purchased)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    -- Code
    ticket_code VARCHAR(20) UNIQUE NOT NULL,
    qr_code_url TEXT,
    
    -- Holder
    holder_name VARCHAR(255),
    holder_email VARCHAR(255),
    holder_phone VARCHAR(20),
    
    -- Payment
    amount_paid DECIMAL(10,2),
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Status
    status VARCHAR(20) DEFAULT 'valid', -- 'valid', 'used', 'cancelled', 'refunded'
    checked_in_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_type ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_contact ON tickets(contact_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);

-- Exhibitors
CREATE TABLE exhibitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), -- if they have own account
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Booth
    booth_number VARCHAR(50),
    booth_location JSONB, -- {x, y, width, height}
    
    -- Contact
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exhibitor Products
CREATE TABLE exhibitor_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exhibitor_id UUID NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'KES',
    image_url TEXT,
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exhibitor_id UUID NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    -- Context
    source VARCHAR(50), -- 'qr_scan', 'chat', 'booth_visit'
    notes TEXT,
    interest_level INTEGER, -- 1-5
    
    -- Follow-up
    follow_up_status VARCHAR(20) DEFAULT 'new',
    followed_up_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **4.2 Module II: Surveys**

```sql
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Structure (flexible schema)
    questions JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    
    -- Limits
    max_responses INTEGER,
    response_count INTEGER DEFAULT 0,
    
    -- Timing
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surveys_org ON surveys(organization_id);
CREATE INDEX idx_surveys_status ON surveys(status);

CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    -- Answers (flexible)
    answers JSONB NOT NULL DEFAULT '{}',
    
    -- Progress
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    current_question INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Analysis
    sentiment_score DECIMAL(3,2),
    ai_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_contact ON survey_responses(contact_id);
```

### **4.3 Module III: Content**

```sql
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Schedule
    schedule_type VARCHAR(20), -- 'daily', 'weekly', 'custom'
    schedule_config JSONB,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Content
    type VARCHAR(20) NOT NULL, -- 'text', 'image', 'audio', 'video', 'document'
    title VARCHAR(255),
    body TEXT,
    media_url TEXT,
    
    -- Schedule
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'draft',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    name VARCHAR(255),
    
    -- Content
    message_type VARCHAR(20) NOT NULL,
    message_content TEXT,
    media_url TEXT,
    
    -- Audience
    audience_filter JSONB, -- {tags: [], segments: []}
    recipient_count INTEGER DEFAULT 0,
    
    -- Execution
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Stats
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'draft',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- [{id, text, votes}]
    
    -- Settings
    allow_multiple BOOLEAN DEFAULT FALSE,
    show_results BOOLEAN DEFAULT TRUE,
    
    -- Timing
    ends_at TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    option_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(poll_id, contact_id)
);
```

### **4.4 Module IV: HypeCards**

```sql
CREATE TABLE hypecard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    name VARCHAR(255) NOT NULL,
    
    -- Canvas
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1080,
    background_type VARCHAR(20), -- 'color', 'image', 'gradient'
    background_value TEXT,
    
    -- Layers
    layers JSONB NOT NULL DEFAULT '[]',
    
    -- Variables
    variables JSONB DEFAULT '[]', -- [{name, type, default}]
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES hypecard_templates(id),
    contact_id UUID REFERENCES contacts(id),
    
    -- Data
    input_data JSONB NOT NULL,
    
    -- Output
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Tokens
    tokens_consumed INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_cards_template ON generated_cards(template_id);
CREATE INDEX idx_generated_cards_contact ON generated_cards(contact_id);
```

### **4.5 Knowledge Base (RAG)**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id),
    
    title VARCHAR(255),
    content TEXT NOT NULL,
    source_url TEXT,
    
    -- Processing
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
    chunk_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small
    
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_org ON embeddings(organization_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## **5. RELATIONSHIPS DIAGRAM**

```
organizations (1) ─────┬───► (N) users
                       ├───► (1) wallets ───► (N) token_transactions
                       ├───► (N) contacts ───► (N) conversations ───► (N) messages
                       ├───► (N) events ───┬──► (N) ticket_types ───► (N) tickets
                       │                   ├──► (N) exhibitors ───► (N) leads
                       │                   └──► (N) sessions
                       ├───► (N) surveys ───► (N) survey_responses
                       ├───► (N) programs ───► (N) content_items
                       ├───► (N) broadcasts
                       ├───► (N) polls ───► (N) poll_votes
                       ├───► (N) hypecard_templates ───► (N) generated_cards
                       └───► (N) knowledge_bases ───► (N) documents ───► (N) embeddings
```

---

## **6. INDEXES & PERFORMANCE**

### **6.1 Critical Indexes**

```sql
-- Multi-tenant queries (all modules)
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_surveys_org ON surveys(organization_id);
CREATE INDEX idx_contacts_org ON contacts(organization_id);

-- Lookups
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);

-- Time-based queries
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_events_dates ON events(starts_at, ends_at);

-- Vector similarity search
CREATE INDEX idx_embeddings_vector ON embeddings 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### **6.2 Row-Level Security**

```sql
-- Enable RLS on all tenant tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Policy example
CREATE POLICY org_isolation ON events
    USING (organization_id = current_setting('app.current_org')::uuid);
```

---

## **7. MIGRATION STRATEGY**

### **Phase 1: Core**
1. `organizations`
2. `users`, `roles`, `user_roles`
3. `wallets`, `token_transactions`, `token_purchases`
4. `contacts`
5. `conversations`, `messages`

### **Phase 2: Events**
1. `events`
2. `ticket_types`, `tickets`
3. `exhibitors`, `exhibitor_products`, `leads`

### **Phase 3: Surveys**
1. `surveys`
2. `survey_responses`

### **Phase 4: Content**
1. `programs`, `content_items`
2. `broadcasts`
3. `polls`, `poll_votes`

### **Phase 5: HypeCards & RAG**
1. `hypecard_templates`, `generated_cards`
2. `knowledge_bases`, `documents`, `embeddings`



