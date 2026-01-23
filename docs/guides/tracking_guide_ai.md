# AI Tracking Guide

> **Audience**: Developers integrating AI/LLM agents with the analytics collector.

---

## What This Powers

Sending these events will populate the following dashboard sections:

| Dashboard Section | What It Shows |
|:------------------|:--------------|
| **AI Performance** → AI Classifications | Total classification count |
| **AI Performance** → AI Accuracy | Average confidence score |
| **AI Performance** → Avg Latency | Inference time tracking |
| **AI Performance** → Error Rate | AI failure percentage |
| **AI Performance** → Top User Intents | Intent breakdown chart |
| **AI Performance** → Latency Distribution | Histogram of response times |

---

## Required Events

### 1. ai.classification
Fire when the AI classifies user intent.

```json
{
  "type": "track",
  "event": "ai.classification",
  "userId": "+254712345678",
  "timestamp": "2026-01-23T10:00:15.000Z",
  "properties": {
    "input_text": "I want to file nil returns",
    "detected_intent": "nil_filing",
    "confidence": 0.95,
    "latency_ms": 320,
    "model": "llama3.2:3b",
    "prompt_tokens": 150,
    "completion_tokens": 25
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

### 2. ai.generation
Fire when the AI generates a response.

```json
{
  "type": "track",
  "event": "ai.generation",
  "userId": "+254712345678",
  "properties": {
    "prompt_type": "clarification",
    "output_length": 85,
    "latency_ms": 650,
    "model": "llama3.2:3b"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

### 3. ai.error
Fire when the AI encounters an error.

```json
{
  "type": "track",
  "event": "ai.error",
  "userId": "+254712345678",
  "properties": {
    "error_type": "json_parse_error",
    "recovery_attempt": 1,
    "recovered": true,
    "fallback_action": "retry",
    "model": "llama3.2:3b"
  },
  "context": {
    "channel": "whatsapp"
  }
}
```

---

## Property Reference

### ai.classification Properties

| Property | Type | Required | Description |
|:---------|:-----|:---------|:------------|
| `detected_intent` | string | ✅ | Classified intent (e.g., `nil_filing`) |
| `confidence` | float | ✅ | Confidence score 0-1 |
| `latency_ms` | int | ✅ | Inference time in milliseconds |
| `model` | string | Recommended | Model identifier |
| `input_text` | string | Optional | User input (for debugging) |
| `prompt_tokens` | int | Optional | Input tokens (for cost tracking) |
| `completion_tokens` | int | Optional | Output tokens |

### ai.error Properties

| Property | Type | Required | Description |
|:---------|:-----|:---------|:------------|
| `error_type` | string | ✅ | Error category (see below) |
| `recovered` | boolean | ✅ | Whether recovery succeeded |
| `recovery_attempt` | int | Optional | Which retry attempt |
| `fallback_action` | string | Optional | Action taken (retry/agent_handoff/skip) |
| `model` | string | Optional | Model that failed |

### Error Types

| Error Type | Description |
|:-----------|:------------|
| `timeout` | Model took too long to respond |
| `json_parse_error` | Output wasn't valid JSON |
| `network` | Network error reaching model |
| `context_length` | Input exceeded model context |
| `rate_limit` | API rate limit hit |
| `invalid_response` | Response didn't match expected format |

---

## Intent Categories

Use consistent intent names for meaningful analytics:

| Intent | Description |
|:-------|:------------|
| `nil_filing` | Filing nil returns |
| `pin_registration` | KRA PIN registration |
| `etims_query` | eTIMS questions |
| `tcc_application` | Tax Compliance Certificate |
| `payment_status` | Payment inquiries |
| `general_inquiry` | General questions |
| `greeting` | Hi/Hello messages |
| `unknown` | Could not classify |

---

## Implementation Checklist

- [ ] `ai.classification` fired for every intent detection
- [ ] `confidence` score included (0-1 range)
- [ ] `latency_ms` tracked for all AI calls
- [ ] `ai.error` fired for failures with `error_type`
- [ ] `recovered` flag indicates retry success
- [ ] Consistent `detected_intent` naming convention
- [ ] `model` included for multi-model setups
