# Agent Handover Webhook

**Endpoint**: `POST /api/dashboard/agent/integration/handover`  
**Auth**: Bearer Token (JWT from Login) OR API Key (Future)

## Overview
This webhook allows external systems (like a Chatbot or Flow Builder) to pass control of a conversation to the Agent System. It creates a session (if none exists), queues it for assignment, and optionally sends a confirmation message to the user.

## Payload

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `contactId` | string | Yes | The user's phone number or external ID (e.g., `+254...`). |
| `tenantId` | string | Optional | UUID of the Organization. If omitted, uses the authenticated user's tenant. |
| `name` | string | Optional | User's display name (e.g., "John Doe"). |
| `teamId` | string | Optional | UUID of the Team to assign this chat to (e.g., Support Team). If omitted, goes to General Queue. |
| `issue` | string | Optional | Description of what the user was trying to do (e.g., "Account Locked"). Used for routing. |
| `sendHandoverMessage` | boolean | Optional | (Default: `true`) If `true`, sends the confirmation message to the user. If `false`, assumes the bot already sent it. |
| `handoverMessage` | string | Optional | Custom content for the confirmation message. Default: "Connecting you to an agent...". |
| `context` | object | Optional | JSON object with extra metadata (e.g., `{ "intent": "billing", "botFlow": "claims" }`). |

## Example Requests

### Standard Handover (Default Message)
```bash
curl -X POST https://analytics.chatnation.co.ke/api/dashboard/agent/integration/handover \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "+254712345678",
    "name": "Jane User",
    "tenantId": "0486b793-bbeb-4490-9f6b-4d1704fb1244"
  }'
```

### Silent Handover (No Message)
Use this if your bot already said "Hold on, connecting you...".
```bash
curl -X POST ... \
  -d '{
    "contactId": "+254712345678",
    "sendHandoverMessage": false
  }'
```

### Custom Handover Message
```bash
curl -X POST ... \
  -d '{
    "contactId": "+254712345678",
    "handoverMessage": "Hold tight! A Sales Expert will be with you in ~2 mins."
  }'
```

## Response
**Success (201 Created)**
```json
{
  "id": "session-uuid",
  "status": "unassigned",
  "assignedTeamId": null
}
```
