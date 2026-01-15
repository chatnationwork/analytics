# Analytics Event Schema

This document defines the standard schema for events captured by the Analytics Service.

## 1. Common Fields (The "Envelope")
Every event sent to the collector MUST include these fields.

| Field | Type | Description | Required | Example |
| :--- | :--- | :--- | :--- | :--- |
| `event_id` | UUID | Unique identifier for this specific event instance. | Yes | `550e8400-e29b-41d4-a716-446655440000` |
| `event_name` | String | The name of the action (e.g., `page_view`, `click`). | Yes | `button_click` |
| `timestamp` | ISO 8601 | Time when the event occurred on the client. | Yes | `2023-10-27T10:00:00Z` |
| `anonymous_id` | UUID | Persistent ID for the device/browser. | Yes | `123e4567-e89b-12d3...` |
| `user_id` | String | Authenticated user ID (if logged in). | No | `A012345678X` (PIN) |
| `session_id` | UUID | ID for the current browsing session. | Yes | `987fcdeb-51a2-...` |
| `context` | Object | Device and browser context (see below). | Yes | `{ "library": "js", "userAgent": "..." }` |
| `properties` | Object | Custom properties specific to the event. | No | `{ "button_text": "Submit" }` |
| `message_id` | UUID | Deduplication ID (usually same as event_id). | Yes | `...` |

## 2. Context Object
Describes the environment where the event happened. Auto-collected by the SDK.

```json
{
  "library": {
    "name": "analytics.js",
    "version": "1.0.0"
  },
  "page": {
    "path": "/nil-mri-tot/mri/rental-income",
    "referrer": "https://google.com...",
    "search": "?source=whatsapp",
    "title": "MRI Returns",
    "url": "https://tax.app/..."
  },
  "userAgent": "Mozilla/5.0 ...",
  "ip": "1.2.3.4" (Added by Collector),
  "locale": "en-US",
  "screen": {
    "width": 1920,
    "height": 1080
  }
}
```

## 3. Standard Events

### `page_view`
Triggered automatically on route change.
*   **Properties**: None (handled by `context.page`).

### `identify`
Triggered when a user logs in or updates their profile.
*   **Properties**:
    *   `email` (string)
    *   `phone` (string)
    *   `pin` (string)
    *   `name` (string)

### `track`
Generic wrapper for custom actions.
*   **Properties**: Arbitrary JSON/Object.

## 4. Custom Events (Tax App Specific)

### `validation_success`
*   **Properties**:
    *   `obligation_type`: "mri" | "tot" | "nil"

### `return_filed`
*   **Properties**:
    *   `obligation`: "mri" | "tot"
    *   `receipt_number`: "MRI-123456"
    *   `period`: "01/01/2024 - 31/01/2024"
    *   `amount`: 500.00

### `payment_initiated`
*   **Properties**:
    *   `prn`: "22334455"
    *   `amount`: 50.00
    *   `phone_masked`: "2547***0238"
