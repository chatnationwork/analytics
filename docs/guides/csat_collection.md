# CSAT event collection

Customer satisfaction (CSAT) events are collected via the same capture API as other analytics events. Use the event name `csat_submitted` and include `rating` and optional `feedback` in `properties`. We expect the contact identifier (e.g. phone number) in `user_id`.

## Payload shape

Send a batch to the collector (e.g. `POST /v1/capture`) with the same structure as other events. Example for a single CSAT event:

```json
{
  "batch": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_name": "csat_submitted",
      "event_type": "track",
      "timestamp": "2023-10-27T10:00:00.000Z",
      "anonymous_id": "123e4567-e89b-12d3-a456-426614174000",
      "session_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "user_id": "254745050238",
      "context": {
        "page": {
          "path": "/csat",
          "title": "Feedback",
          "url": "https://your-domain.com/csat",
          "referrer": "..."
        },
        "userAgent": "...",
        "library": { "name": "f88-custom-analytics", "version": "1.0.0" }
      },
      "properties": {
        "rating": 5,
        "feedback": "Great experience, very fast!"
      }
    }
  ],
  "sent_at": "2023-10-27T10:00:00.000Z",
  "write_key": "your-write-key-from-env"
}
```

- **user_id**: Contact identifier; we expect a **phone number** (e.g. `254745050238`). It is normalized to digits-only before storage so analytics can group by contact consistently.
- **session_id**: Session UUID. If this matches an inbox session that has a resolution, the resolution row is updated with `csatScore` and `csatFeedback`.
- **properties.rating**: Numeric score (e.g. 1–5). Required for resolution CSAT update.
- **properties.feedback**: Optional text feedback.

## Processing

1. **Collector**: Accepts the batch like any other event. For `event_name === "csat_submitted"`, `user_id` is normalized to digits only (e.g. `"254 745 050 238"` → `"254745050238"`).
2. **Processor**: Events are written to the `events` table. For each `csat_submitted` event, if a row in `resolutions` exists with the same `sessionId`, that row’s `csatScore` and `csatFeedback` are updated from `properties.rating` and `properties.feedback`. This links CSAT to the resolved chat for agent/CSAT analytics.

## Querying CSAT

- **Events**: Query `events` with `eventName = 'csat_submitted'`. Use `userId` (normalized phone) and `properties.rating` / `properties.feedback` for aggregations.
- **Resolutions**: Query `resolutions` for `csatScore` and `csatFeedback` when the survey was sent with the same `session_id` as the resolved inbox session.
