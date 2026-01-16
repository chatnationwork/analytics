# CRM API Documentation

This document provides comprehensive documentation for the CRM APIs used for managing contacts, custom fields, campaigns, and messages in the chatbot and automation platform.

## Authentication

All CRM API requests require authentication using an API key passed in the request header:

```
API-KEY: {{access-token}}
```

## Base URL

```
{{crmapi_domain}}
```

Replace `{{crmapi_domain}}` with your actual CRM API domain (e.g., `https://api.yourdomain.com`).

---

## 1. Contact API

The Contact API allows you to manage contacts (chats) in the CRM system.

### 1.1 Create Contact

Creates a new contact with associated details.

**Endpoint:** `POST /crm/chat`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Request Body:**
```json
{
  "whatsapp_number": "+254712345678",
  "email": "user@example.com",
  "name": "John Doe",
  "custom_fields": {
    "company": "Acme Inc",
    "role": "Developer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chat_id": "chat_abc123",
    "whatsapp_number": "+254712345678",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2026-01-16T08:00:00Z"
  }
}
```

---

### 1.2 Search Contact

Search for contacts using specific criteria.

**Endpoint:** `GET /crm/chat/search`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search_field | string | Yes | Field to search (e.g., `email`, `whatsapp_number`, `name`) |
| search_value | string | Yes | Value to search for |
| condition | string | Yes | Search condition: `contains`, `equal to`, `starts with`, `ends with` |

**Example Request:**
```
GET /crm/chat/search?search_field=email&search_value=user@example.com&condition=equal to
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "chat_id": "chat_abc123",
      "whatsapp_number": "+254712345678",
      "email": "user@example.com",
      "name": "John Doe"
    }
  ]
}
```

---

### 1.3 List Contacts

Retrieve a paginated list of all contacts.

**Endpoint:** `GET /crm/chat`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "chat_id": "chat_abc123",
      "whatsapp_number": "+254712345678",
      "email": "user@example.com",
      "name": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

### 1.4 List Custom Fields for Chat

Retrieve custom fields specific to a chat/contact.

**Endpoint:** `GET /crm/chat/setting/{{chat_id}}/custom-field`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chat_id | string | Yes | The unique identifier of the chat |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "field_id": "field_123",
      "field_name": "company",
      "field_type": "string",
      "value": "Acme Inc"
    }
  ]
}
```

---

### 1.5 Mark Chat as Done

Mark a conversation as completed.

**Endpoint:** `POST /crm/chat/setting/{{chat_id}}/operator/mark_as_done`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chat_id | string | Yes | The unique identifier of the chat |

**Request Body (V2 with metadata):**
```json
{
  "metadata": {
    "resolution_notes": "Issue resolved successfully"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat marked as done"
}
```

---

### 1.6 Assign Chat

Assign a chat to an operator.

**Endpoint:** `POST /crm/chat/setting/{{chat_id}}/operator/assign_chat`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chat_id | string | Yes | The unique identifier of the chat |

**Request Body:**
```json
{
  "operator_email": "agent@company.com",
  "pause_automation": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat assigned successfully",
  "data": {
    "assigned_to": "agent@company.com"
  }
}
```

---

### 1.7 Delete Contact

Remove a contact/chat from the system.

**Endpoint:** `DELETE /crm/chat/{{chat_id}}`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chat_id | string | Yes | The unique identifier of the chat |

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

---

## 2. Custom Field API

Manage global custom fields for the CRM.

### 2.1 List All Custom Fields

Retrieve all globally defined custom fields.

**Endpoint:** `GET /crm/setting/custom-field`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "custom_field_id": "cf_001",
      "name": "company",
      "type": "string",
      "required": false
    },
    {
      "custom_field_id": "cf_002",
      "name": "subscription_tier",
      "type": "string",
      "required": true
    }
  ]
}
```

---

### 2.2 Create Custom Field

Create a new global custom field.

**Endpoint:** `POST /crm/setting/custom-field`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Request Body:**
```json
{
  "name": "department",
  "type": "string",
  "required": false,
  "default_value": ""
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "custom_field_id": "cf_003",
    "name": "department",
    "type": "string"
  }
}
```

---

### 2.3 Delete Custom Field

Remove a custom field.

**Endpoint:** `DELETE /crm/setting/custom-field/{{custom_field_id}}`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| custom_field_id | string | Yes | The unique identifier of the custom field |

**Response:**
```json
{
  "success": true,
  "message": "Custom field deleted successfully"
}
```

---

## 3. Campaign API

Manage marketing and messaging campaigns.

### 3.1 List All Campaigns

Retrieve all campaigns.

**Endpoint:** `GET /crm/campaign`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": "camp_001",
      "name": "Welcome Series",
      "status": "active",
      "created_at": "2026-01-10T09:00:00Z",
      "scheduled_at": null
    }
  ],
  "count": 1,
  "page": 1,
  "rows": 20
}
```

---

### 3.2 Campaign Report

Get detailed metrics for a specific campaign.

**Endpoint:** `GET /crm/campaign/{{campaign_id}}/report`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| campaign_id | string | Yes | The unique identifier of the campaign |

**Response:**
```json
{
  "success": true,
  "campaign_id": "camp_001",
  "name": "Welcome Series",
  "metrics": {
    "total_recipients": 1000,
    "delivered": 980,
    "read": 750,
    "replied": 120,
    "failed": 20
  },
  "delivery_rate": "98%",
  "read_rate": "76.5%",
  "reply_rate": "12.2%"
}
```

---

### 3.3 Create Quick/Bulk Campaign

Create and schedule a campaign to send messages to multiple recipients.

**Endpoint:** `POST /crm/campaign`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Request Body:**
```json
{
  "name": "Product Launch Announcement",
  "template_name": "product_launch_v1",
  "template_language": "en",
  "receivers": [
    {
      "whatsapp_number": "+254712345678",
      "variables": {
        "1": "John",
        "2": "Product X"
      }
    },
    {
      "whatsapp_number": "+254798765432",
      "variables": {
        "1": "Jane",
        "2": "Product X"
      }
    }
  ],
  "scheduled_at": "2026-01-20T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "camp_002",
    "name": "Product Launch Announcement",
    "status": "scheduled",
    "scheduled_at": "2026-01-20T10:00:00Z",
    "total_recipients": 2
  }
}
```

---

### 3.4 Create Campaign Clone

Clone an existing campaign to a new set of receivers.

**Endpoint:** `POST /crm/campaign/clone`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |
| Content-Type | `application/json` |

**Request Body:**
```json
{
  "source_campaign_id": "camp_001",
  "new_name": "Welcome Series - Batch 2",
  "receivers": [
    {
      "whatsapp_number": "+254711111111",
      "variables": {
        "1": "Alice"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "camp_003",
    "name": "Welcome Series - Batch 2",
    "status": "draft"
  }
}
```

---

### 3.5 Trigger Campaign

Manually trigger a created campaign to start sending.

**Endpoint:** `POST /crm/campaign/{{campaign_id}}/trigger`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| campaign_id | string | Yes | The unique identifier of the campaign |

**Response:**
```json
{
  "success": true,
  "message": "Campaign triggered successfully",
  "data": {
    "campaign_id": "camp_002",
    "status": "in_progress"
  }
}
```

---

## 4. Messages API

Retrieve message history for conversations.

### 4.1 Get Messages

Retrieve message history for a specific chat.

**Endpoint:** `GET /crm/chat/{{chat_id}}/messages`

**Headers:**
| Header | Value |
|--------|-------|
| API-KEY | `{{access-token}}` |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chat_id | string | Yes | The unique identifier of the chat |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Messages per page (default: 50) |
| sort | string | No | Sort order: `newest` or `oldest` (default: `newest`) |

**Example Request:**
```
GET /crm/chat/chat_abc123/messages?page=1&limit=20&sort=newest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "message_id": "msg_001",
        "type": "text",
        "content": "Hello, how can I help you?",
        "direction": "outbound",
        "status": "delivered",
        "timestamp": "2026-01-16T08:30:00Z"
      },
      {
        "message_id": "msg_002",
        "type": "text",
        "content": "I need help with my order",
        "direction": "inbound",
        "status": "received",
        "timestamp": "2026-01-16T08:31:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "developer_message": "Invalid or missing API key"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 422 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "whatsapp_number",
        "message": "Invalid phone number format"
      }
    ]
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Rate Limits

| Tier | Requests per Minute | Requests per Day |
|------|---------------------|------------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | 1,000 | Unlimited |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-16 | Initial CRM API documentation |
