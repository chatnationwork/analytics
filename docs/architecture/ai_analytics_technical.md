# AI Analytics - Technical Specification

## Overview

This document specifies how to collect, store, query, and visualize AI observability events from the LLM-powered tax agent.

---

## Event Types

### 1. `ai.classification`

Fired when the intent classifier completes a prediction.

```typescript
{
  event: 'ai.classification',
  userId: '+254712345678',
  properties: {
    input_text: 'I want to file nil returns',
    detected_intent: 'nil_filing',
    confidence: 0.99,
    latency_ms: 450,
    prompt_tokens: 120,
    completion_tokens: 15,
    model: 'llama3.2:3b',
    session_id: 'sess_abc123'
  },
  context: {
    channel: 'whatsapp',
    library: { name: 'tax-agent-ai', version: '1.0.0' }
  }
}
```

**Key Fields**:
- `detected_intent` - The classified intent (e.g., `nil_filing`, `pin_registration`, `etims_query`)
- `confidence` - Float 0-1 representing certainty
- `latency_ms` - Time taken for inference
- `prompt_tokens` / `completion_tokens` - Token usage for cost tracking

---

### 2. `ai.generation`

Fired for LLM text generation (drafting responses, clarifications).

```typescript
{
  event: 'ai.generation',
  userId: '+254712345678',
  properties: {
    prompt_type: 'clarification', // or 'response', 'summary'
    output_length: 45,
    latency_ms: 800,
    model: 'llama3.2:3b'
  }
}
```

---

### 3. `ai.error`

Fired when the AI layer encounters an error.

```typescript
{
  event: 'ai.error',
  userId: '+254712345678',
  properties: {
    error_type: 'json_parse_error', // 'timeout', 'network', 'context_length'
    recovery_attempt: 1,
    recovered: false,
    fallback_action: 'agent_handoff' // or 'retry', 'default_response'
  }
}
```

---

## Database Queries

### Query: Intent Breakdown (Last 30 Days)

```sql
SELECT 
  properties->>'detected_intent' as intent,
  COUNT(*) as count,
  AVG((properties->>'confidence')::float) as avg_confidence
FROM events
WHERE event_name = 'ai.classification'
  AND tenant_id = :tenantId
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties->>'detected_intent'
ORDER BY count DESC
LIMIT 10;
```

### Query: AI vs Agent Response Time

```sql
-- AI Response Time
SELECT 
  AVG((properties->>'latency_ms')::int) as avg_ai_latency_ms
FROM events
WHERE event_name IN ('ai.classification', 'ai.generation')
  AND tenant_id = :tenantId
  AND timestamp >= NOW() - INTERVAL '30 days';

-- Compare to Agent Response Time (existing)
-- Use getWhatsappResponseTime() from event.repository.ts
```

### Query: Error Rate

```sql
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE event_name = 'ai.error') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE event_name = 'ai.classification'), 0),
    2
  ) as error_rate_pct
FROM events
WHERE event_name IN ('ai.classification', 'ai.error')
  AND tenant_id = :tenantId
  AND timestamp >= NOW() - INTERVAL '30 days';
```

### Query: Token Usage (Cost Estimation)

```sql
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  SUM((properties->>'prompt_tokens')::int) as total_prompt_tokens,
  SUM((properties->>'completion_tokens')::int) as total_completion_tokens
FROM events
WHERE event_name = 'ai.classification'
  AND tenant_id = :tenantId
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day;
```

---

## Repository Methods to Add

```typescript
// In event.repository.ts

async getAiIntentBreakdown(tenantId: string, startDate: Date, endDate: Date) {
  // Returns: [{ intent: 'nil_filing', count: 245, avgConfidence: 0.94 }, ...]
}

async getAiPerformanceStats(tenantId: string, startDate: Date, endDate: Date) {
  // Returns: { totalClassifications, avgLatencyMs, errorRate, avgConfidence }
}

async getAiTokenUsage(tenantId: string, startDate: Date, endDate: Date) {
  // Returns: [{ date: '2026-01-20', promptTokens: 12000, completionTokens: 3500 }, ...]
}

async getAiErrorBreakdown(tenantId: string, startDate: Date, endDate: Date) {
  // Returns: [{ errorType: 'timeout', count: 12, recoveredPct: 75 }, ...]
}
```

---

## API Endpoints to Add

```
GET /api/dashboard/ai/stats
GET /api/dashboard/ai/intents
GET /api/dashboard/ai/token-usage
GET /api/dashboard/ai/errors
```

---

## Dashboard Components to Create

### 1. AI Stats Cards

| Card | Source |
|:-----|:-------|
| AI Accuracy | `avg(confidence)` from `ai.classification` |
| Avg AI Latency | `avg(latency_ms)` from `ai.classification` |
| Error Rate | `count(ai.error) / count(ai.classification)` |
| Daily Classifications | `count(ai.classification)` |

### 2. Intent Breakdown Chart

Horizontal bar chart showing top 10 intents by volume.

### 3. AI Latency Histogram

Similar to Response Time Histogram, but for AI inference time.
Buckets: 0-100ms, 100-200ms, 200-500ms, 500-1000ms, 1000ms+

### 4. Error Type Breakdown

Pie chart showing distribution of error types (timeout, parse_error, network).

---

## Integration with Existing Components

### User Journey Page

Add AI events to the timeline:
```
10:00:01 📱 message.received - "I want to file nil returns"
10:00:01 🤖 ai.classification - Intent: nil_filing (99%)
10:00:02 📤 message.sent - "Starting NIL filing..."
```

### Agent Handoff Correlation

When `agent.handoff` occurs, check preceding `ai.classification` event:
- If low confidence → handoff due to uncertainty
- If `ai.error` → handoff due to failure

---

## File Structure

```
apps/dashboard-api/src/
  ai-analytics/
    ai-analytics.module.ts
    ai-analytics.service.ts
    ai-analytics.controller.ts

libs/database/src/repositories/
  event.repository.ts  # Add AI query methods

packages/dashboard-ui/
  lib/ai-analytics-api.ts
  app/(dashboard)/ai-analytics/page.tsx  # Or integrate into whatsapp-analytics
```
