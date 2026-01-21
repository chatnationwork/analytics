# Database Schema

## Overview
This document defines the database schema for storing analytics events. The schema is designed for **ClickHouse** (recommended for scale) with **PostgreSQL** alternatives noted.

---

## 1. Core Events Table

### ClickHouse Schema

```sql
CREATE TABLE events (
    -- Identifiers
    event_id UUID,
    message_id UUID,  -- For deduplication
    
    -- Tenant
    tenant_id String,
    project_id String,
    
    -- Event Info
    event_name LowCardinality(String),
    event_type LowCardinality(String) DEFAULT 'track',  -- track, identify, page
    timestamp DateTime64(3),
    received_at DateTime64(3),
    
    -- Identity
    anonymous_id String,
    user_id Nullable(String),
    session_id String,
    
    -- Channel (Phase 2 ready)
    channel_type LowCardinality(String) DEFAULT 'web',  -- web, whatsapp
    external_id Nullable(String),  -- WhatsApp phone ID
    handshake_token Nullable(String),
    
    -- Context (flattened for query performance)
    page_path String,
    page_url String,
    page_title String,
    page_referrer String,
    
    -- Device
    user_agent String,
    device_type LowCardinality(String),  -- desktop, mobile, tablet
    os_name LowCardinality(String),
    os_version String,
    browser_name LowCardinality(String),
    browser_version String,
    
    -- Geo (enriched by processor)
    ip_address String,
    country_code LowCardinality(String),
    city String,
    
    -- Properties (flexible JSON)
    properties String,  -- JSON string
    
    -- Metadata
    sdk_version String,
    processed_at DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, event_id)
TTL timestamp + INTERVAL 2 YEAR;
```

### PostgreSQL Alternative

```sql
CREATE TABLE events (
    event_id UUID PRIMARY KEY,
    message_id UUID UNIQUE,
    
    tenant_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(20) DEFAULT 'track',
    timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    
    anonymous_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    session_id VARCHAR(100) NOT NULL,
    
    channel_type VARCHAR(20) DEFAULT 'web',
    external_id VARCHAR(100),
    handshake_token VARCHAR(100),
    
    page_path VARCHAR(500),
    page_url TEXT,
    page_title VARCHAR(500),
    page_referrer TEXT,
    
    user_agent TEXT,
    device_type VARCHAR(20),
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    browser_name VARCHAR(50),
    browser_version VARCHAR(50),
    
    ip_address INET,
    country_code CHAR(2),
    city VARCHAR(100),
    
    properties JSONB,
    
    sdk_version VARCHAR(20),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_events_tenant_time ON events(tenant_id, timestamp DESC);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_user ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_name ON events(event_name);

-- Partitioning (recommended for scale)
-- Partition by month: events_2024_01, events_2024_02, etc.
```

---

## 2. Sessions Table

Materialized view or separate table for session-level aggregates.

```sql
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY,
    tenant_id String,
    
    anonymous_id String,
    user_id Nullable(String),
    
    -- Timing
    started_at DateTime64(3),
    ended_at DateTime64(3),
    duration_seconds UInt32,
    
    -- Metrics
    event_count UInt16,
    page_count UInt16,
    
    -- First touch
    entry_page String,
    referrer String,
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    
    -- Device
    device_type LowCardinality(String),
    country_code LowCardinality(String),
    
    -- Outcome (computed)
    converted Boolean DEFAULT false,
    conversion_event Nullable(String)
)
ENGINE = ReplacingMergeTree(ended_at)
ORDER BY (tenant_id, session_id);
```

---

## 3. Identities Table

Links anonymous IDs to known users for cross-session/cross-device tracking.

```sql
CREATE TABLE identities (
    tenant_id String,
    anonymous_id String,
    user_id String,
    
    linked_at DateTime64(3),
    link_source LowCardinality(String),  -- 'identify', 'login', 'handshake'
    
    -- User traits (denormalized for quick lookup)
    traits String  -- JSON: { "name": "...", "email": "...", "pin": "..." }
)
ENGINE = ReplacingMergeTree(linked_at)
ORDER BY (tenant_id, anonymous_id, user_id);
```

---

## 4. Projects Table (Multi-Tenant)

```sql
CREATE TABLE projects (
    project_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    write_key VARCHAR(100) UNIQUE NOT NULL,  -- Public key for SDK
    
    allowed_origins TEXT[],  -- CORS whitelist
    
    settings JSONB,  -- Rate limits, retention policy, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Phase 2: Conversation States (WhatsApp)

Reserved for future implementation:

```sql
CREATE TABLE conversations (
    conversation_id UUID PRIMARY KEY,
    tenant_id String,
    
    whatsapp_phone_id String,
    user_id Nullable(String),
    
    -- State machine
    current_state LowCardinality(String),  -- queued, bot_active, agent_active, resolved
    
    -- Timing
    started_at DateTime64(3),
    first_response_at Nullable(DateTime64(3)),
    resolved_at Nullable(DateTime64(3)),
    
    -- Metrics
    message_count UInt16,
    bot_message_count UInt16,
    agent_message_count UInt16,
    
    -- Cross-channel
    linked_session_id Nullable(String),
    handshake_token Nullable(String)
);
```

---

## Index Strategy

| Query Pattern | Index |
|---------------|-------|
| Events by time range | `(tenant_id, timestamp)` - Primary |
| Funnel queries | `(tenant_id, event_name, timestamp)` |
| User history | `(user_id, timestamp)` |
| Session lookup | `(session_id)` |
| Deduplication | `(message_id)` - Unique |

---

## Data Retention

| Data Type | Retention | Action |
|-----------|-----------|--------|
| Raw events | 2 years | TTL delete |
| Sessions | 2 years | TTL delete |
| Identities | Indefinite | Manual cleanup |
| Aggregates | 5 years | Archive to cold storage |
