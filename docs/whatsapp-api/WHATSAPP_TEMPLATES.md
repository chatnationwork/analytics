# WhatsApp Template API Documentation

This document outlines how Whatomate interacts with the Meta WhatsApp Business API for managing message templates.

## Overview

Template management involves a dual-state system:
1.  **Local State**: Templates are created locally in the database with status `DRAFT`.
2.  **Meta State**: Templates are submitted to Meta for approval (`PENDING` -> `APPROVED`/`REJECTED`).

## API Endpoints

All requests are made to the Meta Graph API.
**Base URL**: `https://graph.facebook.com`

| Action | HTTP Method | Endpoint |
| :--- | :--- | :--- |
| **Create Template** | `POST` | `/{api_version}/{business_id}/message_templates` |
| **Update Template** | `POST` | `/{api_version}/{meta_template_id}` |
| **Delete Template** | `DELETE` | `/{api_version}/{business_id}/message_templates?name={name}` |
| **Get Templates** | `GET` | `/{api_version}/{business_id}/message_templates` |
| **Upload Media** | `POST` | `/{api_version}/{app_id}/uploads` (Resumable API) |

---

## 1. Creating a Template

**Endpoint**: `POST /{api_version}/{business_id}/message_templates`

### Request Payload

```json
{
  "name": "seasonal_promotion",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": [ "4::aW1hZ2..." ] // Upload handle for media
      }
    },
    {
      "type": "BODY",
      "text": "Hello {{1}}, check out our summer sale!",
      "example": {
        "body_text": [
          [ "John" ]
        ]
      }
    },
    {
      "type": "FOOTER",
      "text": "Reply STOP to unsubscribe"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Yes, I'm interested"
        },
         {
          "type": "URL",
          "text": "Visit Website",
          "url": "https://example.com/shop"
        }
      ]
    }
  ]
}
```

### Key Parameters

*   **category**: `AUTHENTICATION`, `MARKETING`, or `UTILITY`.
*   **components**: Array of template parts (`HEADER`, `BODY`, `FOOTER`, `BUTTONS`).
*   **example**: **REQUIRED** for all variables (`{{1}}`) and media headers. Meta looks for these to validate the template content.

---

## 2. Updating a Template

**Endpoint**: `POST /{api_version}/{meta_template_id}`

Only the `components` array is sent. Name, language, and category cannot be changed.

### Request Payload

```json
{
  "components": [
    {
      "type": "BODY",
      "text": "New text content here {{1}}",
      "example": { "body_text": [["Value"]] }
    }
  ]
}
```

---

## 3. Uploading Media (Headers)

For `IMAGE`, `VIDEO`, or `DOCUMENT` headers, you must upload the file to Meta to get a **handle**. This is done via the Resumable Upload API.

### Step 1: Create Upload Session
**Endpoint**: `POST /{api_version}/{app_id}/uploads`

**Payload**:
```json
{
  "file_length": 12345,
  "file_type": "image/jpeg",
  "file_name": "header_image.jpg"
}
```

**Response**:
```json
{
  "id": "upload_session_id_123"
}
```

### Step 2: Upload File Content
**Endpoint**: `POST /{api_version}/{upload_session_id}`
**Headers**:
*   `Authorization`: `OAuth {access_token}`
*   `file_offset`: `0`

**Response**:
```json
{
  "h": "4::aW1hZ2..." // This is the handle used in the template creation payload
}
```

---

## 4. Retrieving Templates

**Endpoint**: `GET /{api_version}/{business_id}/message_templates`

Returns a list of all templates for the business account, including their status (`APPROVED`, `REJECTED`, `PENDING`).

---

## Implementation Details

*   **Client**: `pkg/whatsapp/client.go` handles the low-level HTTP requests and authentication.
*   **Template Logic**: `pkg/whatsapp/template.go` constructs the complex `components` structure, including mapping local `sample_values` to Meta's expected `example` format.
*   **Variable Handling**: The system supports both positional (`{{1}}`) and named (`{{name}}`) parameters. Named parameters are converted to Meta's format automatically.

## 6. Using Variables in Templates

WhatsApp templates use numbered placeholders like `{{1}}`, `{{2}}`, etc.

### Designing a Template
When creating a template, use `{{1}}` where you want dynamic content.
**Example Body**:
```
Hello {{1}},
Your order {{2}} is ready for pickup.
```

### Sending a Template
When sending a campaign using this template, you must map each variable number to a value.
- **Variable {{1}}**: Mapped to `{{name}}` (Extracts contact's name)
- **Variable {{2}}**: Mapped to `{{metadata.orderId}}` (Extracts custom order ID)

The system resolves these mappings at send time using the [Message Placeholders](../features/message-placeholders.md) system.
