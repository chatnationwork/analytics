# Journey Start & End (Capture API)

Optional fields on **POST /v1/capture** let you mark when a user **starts** or **ends** a journey. When set to `true`, these are stored in the event’s `properties` and can be used by **funnels** and **self-serve analytics** to measure starts, completions, and drop-off.

## Request shape

Each event in the `batch` can include:

| Field           | Type    | Required | Description                                                                                                          |
| --------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `journey_start` | boolean | No       | `true` = this event marks the **start** of a journey (e.g. user landed on a flow). Omitted or `false` = not a start. |
| `journey_end`   | boolean | No       | `true` = this event marks the **end** of a journey (e.g. user completed the flow). Omitted or `false` = not an end.  |

Example:

```json
{
  "batch": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_name": "eTIMS",
      "timestamp": "2026-02-03T10:00:00.000Z",
      "anonymous_id": "...",
      "session_id": "...",
      "context": { "page": { "path": "/etims" } },
      "properties": { "step": "sales-invoice" },
      "journey_start": true
    },
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440001",
      "event_name": "eTIMS",
      "timestamp": "2026-02-03T10:05:00.000Z",
      "anonymous_id": "...",
      "session_id": "...",
      "context": { "page": { "path": "/etims/done" } },
      "properties": { "step": "sales-invoice" },
      "journey_end": true
    }
  ],
  "sent_at": "2026-02-03T10:05:01.000Z"
}
```

- When **omitted**, events are unchanged and not treated as journey start/end.
- You can send **only** `journey_start`, **only** `journey_end`, or both on the same event (e.g. one-step flow).

## How it’s stored

- Values are normalized into the event’s **properties** in the database:
  - `journey_start: true` → `properties.journeyStart = true`
  - `journey_end: true` → `properties.journeyEnd = true`
- No extra columns; everything stays in the existing `events.properties` JSONB column.

## How to use it

### Funnels

- **Journey start**: Count distinct sessions (or users) where **any** event in the step has `properties.journeyStart = true` (or use a dedicated “journey started” step).
- **Journey end**: Count distinct sessions where **any** event has `properties.journeyEnd = true` to get completions.
- **Drop-off**: Sessions with a start but no end in the same journey/step.

### Self-serve analytics

- Use `properties.journeyStart` and `properties.journeyEnd` to:
  - Count how many users **started** vs **completed** a given journey (e.g. eTIMS, NIL Filing).
  - Segment by journey step (e.g. `properties.step` or `event_name`) and filter by start/end.
- Your existing self-serve vs assisted logic (e.g. `journeyStep`, `handoffReason`) can be combined with these flags for richer breakdowns.

### Example SQL (PostgreSQL)

```sql
-- Count journey starts in a date range (by event name)
SELECT "eventName", COUNT(DISTINCT "sessionId") AS starts
FROM events
WHERE "tenantId" = :tenantId
  AND timestamp BETWEEN :start AND :end
  AND (properties->>'journeyStart')::boolean = true
GROUP BY "eventName";

-- Count journey ends (completions)
SELECT "eventName", COUNT(DISTINCT "sessionId") AS completions
FROM events
WHERE "tenantId" = :tenantId
  AND timestamp BETWEEN :start AND :end
  AND (properties->>'journeyEnd')::boolean = true
GROUP BY "eventName";
```

## Best practices

1. **Consistent naming**: Use the same `event_name` (and optional `properties.step`) for the whole journey so you can group start/end by journey.
2. **One start per journey**: Prefer one `journey_start: true` per logical journey (e.g. when the user enters the flow).
3. **One end per completion**: Send `journey_end: true` when the user completes the flow (e.g. success page or “done” step).
4. **Leave unset when not applicable**: Don’t send `journey_start`/`journey_end` for events that aren’t start or end; they’ll be ignored and won’t affect existing funnel or self-serve logic.
