# AI Analytics - Business Value & Dashboard Integration

## Executive Summary

The AI module processes WhatsApp messages to understand user intent and generate responses. By adding observability, we can answer critical business questions about **AI performance**, **cost efficiency**, and **user experience quality**.

---

## How AI Fits Into the Current Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY (WhatsApp)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [User Message] → [AI Classification] → [Intent Detected] → [Response] │
│        │                  │                    │                │       │
│        ▼                  ▼                    ▼                ▼       │
│                                                                         │
│  CURRENT TRACKING          NEW AI TRACKING                              │
│  ─────────────────         ───────────────                              │
│  • message.received        • ai.classification                          │
│  • message.sent            • ai.generation                              │
│  • message.read            • ai.error                                   │
│  • agent.handoff                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Insight**: The AI module sits *between* message receipt and response. Tracking it completes the "why" behind user journeys.

---

## Metrics We Can Collect

### 1. AI Accuracy & Quality

| Metric | Definition | Business Value |
|:-------|:-----------|:---------------|
| **Intent Confidence** | How sure the AI is about classification (0-100%) | Low confidence = potential misunderstanding |
| **Top Intents** | Most common user requests | Guides service prioritization |
| **Fallback Rate** | % of messages AI couldn't classify | Measures AI coverage gaps |
| **Misclassification Rate** | Errors caught by users/agents | Tracks AI quality over time |

### 2. AI Performance

| Metric | Definition | Business Value |
|:-------|:-----------|:---------------|
| **Response Latency** | Time from message to AI response (ms) | User experience quality |
| **Error Rate** | % of AI requests that fail | System reliability |
| **Recovery Success** | % of errors recovered by retry | Resilience of AI layer |
| **Throughput** | Messages processed per minute | Capacity planning |

### 3. AI Cost (Token-Based)

| Metric | Definition | Business Value |
|:-------|:-----------|:---------------|
| **Tokens per Request** | Prompt + completion tokens | Cost monitoring |
| **Cost per Conversation** | Estimated $ per user session | Unit economics |
| **Model Comparison** | Performance vs cost by model | Optimization decisions |

---

## Dashboard Integration Plan

### Option A: New "AI Performance" Tab
Add a dedicated tab in the WhatsApp section for AI-specific metrics.

### Option B: Inline in Existing Views (Recommended)
Enhance existing dashboards with AI context:

| Existing View | New AI Addition |
|:--------------|:----------------|
| **WhatsApp Analytics → Stats Grid** | Add "AI Accuracy %" and "Avg AI Latency" cards |
| **WhatsApp Analytics → Response Time Histogram** | Overlay AI response time vs agent response time |
| **Message Funnel** | Add "AI Classified" as a stage (Received → AI Classified → Responded) |
| **User Journey** | Show AI events inline (classification, generation, errors) |
| **Agent Handoff** | Show *why* handoff happened (low confidence? error? explicit request?) |

---

## New Insights This Enables

### Currently We Know:
- ✅ Messages received / sent / read
- ✅ Response times
- ✅ Agent performance

### With AI Tracking We'll Know:
- What users are asking for (intent breakdown)
- How confident are we in understanding them
- Where the AI fails (errors, low confidence → handoffs)
- How fast is the AI vs agents
- What it costs per conversation

---

## How This Helps KRA Reports

| KRA Report | AI Analytics Contribution |
|:-----------|:--------------------------|
| **Service Channel Performance** | Compare Self-Serve AI resolution vs Agent resolution |
| **Drop-Off Analysis** | Identify if AI failures cause drop-offs |
| **Response Time** | Separate AI latency from total response time |
| **Service-Level Performance** | Intent breakdown maps to services (eTIMS, PIN, TCC) |

---

## Recommended Next Steps

1. **Phase 1**: Start collecting `ai.classification` events
2. **Phase 2**: Add "AI Accuracy" and "AI Latency" to WhatsApp Stats Grid
3. **Phase 3**: Add intent breakdown chart (What are users asking for?)
4. **Phase 4**: Correlate AI confidence with handoff rate
