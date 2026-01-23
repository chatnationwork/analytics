# AI Observability & Analytics Design

## Overview
We need to integrate the LLM core with the standard `chatnation` analytics stack. The goal is to track **AI Performance**, **Cost**, and **Accuracy** alongside standard web/WhatsApp metrics.

## Design Philosophy
1.  **Do Not Block**: Analytics must be side-effects. The user should never wait for an analytics HTTP request to finish.
2.  **Standard Schema**: Use the existing `POST /v1/capture` batch API found in `dashboard-ui` documentation.
3.  **Rich Context**: attach `model`, `latency`, `tokens` (if available), and `confidence` to every event.

## Event Schema Design

We will map AI operations to the `track` event type defined in the API docs.

### 1. Classification Event (`ai.classification`)
Fired when the intent classifier completes a prediction.
```json
{
  "type": "track",
  "event": "ai.classification",
  "userId": "+254712345678", 
  "context": {
    "channel": "whatsapp",
    "ai_model": "llama3.2:3b"
  },
  "properties": {
    "input_text": "I want to file nil returns",
    "detected_intent": "nil_filing",
    "confidence": 0.99,
    "latency_ms": 450,
    "prompt_tokens": 120, // Estimated or actual
    "completion_tokens": 15
  }
}
```

### 2. LLM Completion Event (`ai.generation`)
Fired for general generation tasks (like drafting a response).
```json
{
  "type": "track",
  "event": "ai.generation",
  "userId": "...",
  "properties": {
    "prompt_type": "clarification",
    "output_text": "Could you clarify which tax year?",
    "latency_ms": 800
  }
}
```

### 3. AI Error Event (`ai.error`)
Fired when the LLM fails, times out, or returns malformed data (caught by our reliability layer).
```json
{
  "type": "track",
  "event": "ai.error",
  "userId": "...",
  "properties": {
    "error_type": "json_parse_error", // or "timeout", "network"
    "raw_output": "{ invalid json ...",
    "recovery_attempt": 1
  }
}
```

## Solution Architecture: `AnalyticsService`

We will create a **Mockable** service `AnalyticsService` in `src/modules/analytics/`.

### Interface
```typescript
interface IAnalyticsEvent {
  event: string;
  userId: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
}

export class AnalyticsService {
  constructor(private config: ConfigService) {}

  // The Fire-and-Forget Method
  track(event: IAnalyticsEvent) {
    // 1. Construct Payload
    const payload = {
      batch: [{
        type: 'track',
        event: event.event,
        userId: event.userId,
        timestamp: new Date().toISOString(),
        properties: event.properties,
        context: {
           ...event.context,
           library: { name: 'tax-agent-ai', version: '1.0.0' }
        }
      }]
    };

    // 2. Async Dispatch (Don't await!)
    // We use a non-blocking HTTP call. 
    // In NestJS, we can use HttpService but NOT await the observable/promise to return.
    // However, to be safe, we might want to just log errors if it fails seamlessly.
    
    this.sendToCollector(payload).catch(err => {
      // Ssssh... don't crash. Just log debug.
      console.debug('[Analytics] Failed to send event', err.message);
    });
  }
}
```

### Integration Points
1.  **In `ClassificationService`**: Call `analytics.track('ai.classification', ...)` immediately after result.
2.  **In `LlmService`**: Call `analytics.track('ai.error', ...)` inside the catch blocks of the Reliability Layer.

## Implementation Steps
1.  Create `AnalyticsModule` and `AnalyticsService`.
2.  Configure `ANALYTICS_API_URL` and `ANALYTICS_WRITE_KEY` in `.env`.
3.  Inject `AnalyticsService` into `ClassificationService` and `LlmService`.
