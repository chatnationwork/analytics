# Expiry from Last Contact Inbound Message (Including Orphans)

**Status: Implemented** (Feb 2025)

## Goal

Expiry = **24 hours from the last message the user sent to us** — regardless of whether that message was in-session or orphaned.

Today we use `session.lastInboundMessageAt`, which is only set when a message is stored while the session exists. Orphan messages (stored when no session existed) never update any session, so sessions created at handover often have `lastInboundMessageAt = null`.

## Source of Truth

The definitive timestamp is: **`MAX(messages.createdAt)`** where `direction = 'inbound'` and `contactId` = session’s contact. This includes:

- Messages with `sessionId` (in-session)
- Messages with `sessionId = null` (orphans)

## Implementation Options

### Option A: Subquery on `messages` (no schema change)

Use a correlated subquery in all inbox queries:

```sql
COALESCE(
  session."lastInboundMessageAt",
  (SELECT MAX(m."createdAt") FROM messages m
   WHERE m."tenantId" = session."tenantId"
     AND m."contactId" = session."contactId"
     AND m.direction = 'inbound')
)
```

**Pros:** No schema change, no migration, single source of truth  
**Cons:** Correlated subquery per row; recommend index on `messages(tenantId, contactId, direction, createdAt)` for performance

### Option B: Add `lastInboundAt` to contacts

1. Add `lastInboundAt` to `contacts` (nullable `timestamptz`)
2. Update it whenever we store an inbound message (Collector, Processor, addMessage)
3. In inbox queries, use `COALESCE(session.lastInboundMessageAt, contact.lastInboundAt)`

**Pros:** Simple indexed lookups; no heavy subqueries  
**Cons:** New column + migration; need to keep it in sync everywhere inbound messages are stored

---

## Recommended: Option A (subquery)

Reasons:

- No schema change
- Messages table is already the source of truth
- Backfilling old sessions is automatic
- Index can be added later if needed

---

## Files to Change

### 1. Backend: Inbox Service (`apps/dashboard-api/src/agent-system/inbox.service.ts`)

- **Shared expression:** Define a constant or helper for the expiry cutoff expression using the subquery.
- **getAgentInbox** (lines ~261–282): Replace `COALESCE(session.lastInboundMessageAt, session.lastMessageAt)` with subquery in `pending` and `expired` filters.
- **getAgentInboxCounts** (lines ~337–365): Same replacement for active and expired counts.
- **getTenantInbox** (lines ~428–455): Same for active and expired filters.
- **getTenantInboxCounts** (lines ~428–457): Same for counts.
- **getExpiredSessionsForReengagement** (lines ~1348–1360): Same for date range and cutoff filters.
- **Session mapping** (lines ~572–574): For each returned session, compute `lastInboundMessageAt = COALESCE(s.lastInboundMessageAt, <subquery result>)` and expose that in the response.

### 2. Backend: Agent Inbox Analytics (`apps/dashboard-api/src/agent-inbox-analytics/agent-inbox-analytics.service.ts`)

- Lines ~609, 1188–1189: Replace `COALESCE(lastInboundMessageAt, lastMessageAt)` with the same subquery.

### 3. Optional: Index on `messages`

If performance is an issue:

```sql
CREATE INDEX IF NOT EXISTS idx_messages_contact_inbound_created
ON messages ("tenantId", "contactId", direction, "createdAt" DESC)
WHERE direction = 'inbound';
```

### 4. Frontend

No changes. The API still returns `lastInboundMessageAt`; the backend now computes it from the subquery when the session column is null.

---

## SQL / TypeORM Implementation Notes

### Subquery construction

```typescript
// Subquery for last inbound message per contact (includes orphans)
const lastContactInboundSubquery = (qb: SelectQueryBuilder<InboxSessionEntity>) =>
  qb
    .subQuery()
    .select("MAX(m.\"createdAt\")")
    .from(MessageEntity, "m")
    .where("m.\"tenantId\" = session.\"tenantId\"")
    .andWhere("m.\"contactId\" = session.\"contactId\"")
    .andWhere("m.direction = :inbound", { inbound: MessageDirection.INBOUND })
    .getQuery();
```

Use this in `COALESCE(session.lastInboundMessageAt, (<subquery>))` for:

- `WHERE` clauses in active/expired filters
- `SELECT` for the session mapping (if you want to return the computed value)

### Result mapping

For `getAgentInbox` and `getTenantInbox`, add a `SELECT` for the subquery and map it into `lastInboundMessageAt`:

```typescript
// In mapping of session to API response:
lastInboundMessageAt: (
  s.lastInboundMessageAt ??
  (rawResult as { lastContactInboundAt?: string })?.lastContactInboundAt ??
  null
),
```

This requires the query to include the subquery as a selected column (e.g. `addSelect` with an alias).

---

## getSession (single session)

When returning a single session via `getSession`, also compute `lastInboundMessageAt` using the subquery, so the open chat and timer use the same logic.

---

## Summary

| Area | Change |
|------|--------|
| Inbox filters (active/expired) | Use `COALESCE(session.lastInboundMessageAt, (<subquery>))` instead of `COALESCE(session.lastInboundMessageAt, session.lastMessageAt)` |
| Session response | Include `lastInboundMessageAt` from subquery fallback |
| getSession | Same fallback for single session |
| Agent inbox analytics | Same subquery in expiry filters |
| Frontend | None (API contract unchanged) |
