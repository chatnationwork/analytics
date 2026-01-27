# Bot Builder Integration Guide

## Overview
This guide explains how to connect an external Bot Builder (e.g., Flowise, Typebot, or custom) to the Custom Agent System.

## Handover API

The system exposes a secured endpoint for triggering handovers.

- **Endpoint**: `POST /api/dashboard/agent/integration/handover`
- **Auth**: Bearer Token (JWT from a valid user/system account)

### Request Body

```json
{
  "contactId": "254712345678",      // Required: The user's phone number
  "name": "Jane Doe",               // Optional: User's name
  "context": {                      // Optional: Metadata/Context
    "intent": "billing_dispute",
    "previous_bot_node": "node_123",
    "priority": "high"
  },
  "teamId": "uuid-of-team"          // Optional: Target specific team
}
```

### Response

```json
{
  "id": "session-uuid",
  "status": "assigned", // or 'unassigned'
  "assignedAgentId": "agent-uuid", // if assigned
  ...
}
```

## Integration Steps

1. **Authenticate**: Ensure your bot has a valid JWT token.
2. **Detect Trigger**: In your bot flow, identify when a user asks for a human or fails fallback.
3. **Call API**: Make a HTTP POST request to the handover endpoint.
4. **Notify User**: The bot should reply "Connecting you to an agent..." and then stop processing messages for this user (or enter a 'paused' state).

## Testing

You can test the handover using cURL:

```bash
curl -X POST http://localhost:3001/agent/integration/handover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "contactId": "254700000000",
    "context": { "reason": "test_handover" }
  }'
```
