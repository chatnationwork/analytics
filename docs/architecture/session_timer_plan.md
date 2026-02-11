# Session Timer & Expiry – Changes Plan

## Current Behavior

1. **Timer/reset**: Uses `lastMessageAt` (updated on both inbound and outbound messages).
2. **Display**: 24h window; shows "24h 0m" when full window remains.
3. **Expired filter**: Sessions with `lastMessageAt` older than 24h.
4. **Color coding**: Green (≥16h), amber (≥8h), red (&lt;8h) – shared by timer and ChatList.

## Desired Behavior

1. **Start at 23:59**: Timer shows 23h 59m when it first starts (not 24h 0m).
2. **Reset only on user engagement**: Timer resets when the **customer** sends a message, not when the agent/system sends.
3. **Color coding**: Unchanged logic, but driven by the new expiry base.

## Implementation Plan

### 1. Shared Constant (23h 59m window)

**File**: `packages/dashboard-ui/lib/session-utils.ts`
- Change `SESSION_EXPIRY_HOURS` to 24 (kept for display), add `SESSION_EXPIRY_MS = (24 * 60 - 1) * 60 * 1000` (23h 59m in ms).
- Backend will use a matching constant.

### 2. Frontend – session-utils.ts

**File**: `packages/dashboard-ui/lib/session-utils.ts`
- Use `lastInboundMessageAt` instead of `lastMessageAt` to compute `expiryAt`.
- Fallback: if no `lastInboundMessageAt`, use last inbound from `messages` array; if none, return `expiryAt: null` (“24h window starts when customer sends a message”).
- Use `SESSION_EXPIRY_MS` (23h 59m) for the expiry window.

### 3. Frontend – agent-inbox page (isSessionExpired)

**File**: `packages/dashboard-ui/app/(dashboard)/agent-inbox/page.tsx`
- Change `isSessionExpired` to use `lastInboundMessageAt` instead of `lastMessageAt`.
- Use 23h 59m cutoff for consistency.

### 4. Backend – inbox.service.ts

**Add constant** near top:  
`const SESSION_EXPIRY_MS = (24 * 60 - 1) * 60 * 1000;`  
`const expiredCutoff = () => new Date(Date.now() - SESSION_EXPIRY_MS);`

**Expired filter** (getAgentInbox, getTenantInbox, getAgentInboxCounts, getTenantInboxCounts):
- **expired**: `lastInboundMessageAt IS NOT NULL AND lastInboundMessageAt <= cutoff` (use `COALESCE(lastInboundMessageAt, lastMessageAt)` for older rows).
- **pending/active**: `lastInboundMessageAt IS NULL OR lastInboundMessageAt > cutoff` (sessions without user engagement or with recent engagement).

**getExpiredSessionsForReengagement**:
- Use `COALESCE(lastInboundMessageAt, lastMessageAt)` for the cutoff (same semantics: user engagement or last activity).

### 5. Processor & Inbox addMessage

**Processor** (`apps/processor/.../event-processor.service.ts`):  
- Keep current logic: update `lastMessageAt` on both directions; update `lastInboundMessageAt` only on inbound. No change.

**Inbox addMessage** (`apps/dashboard-api/.../inbox.service.ts`):  
- Already updates `lastInboundMessageAt` only on inbound. No change.

**Collector message-storage** (if used):  
- Same behavior. No change.

### 6. SessionExpiryTimer

**File**: `packages/dashboard-ui/components/agent-inbox/SessionExpiryTimer.tsx`
- Already uses `getSessionExpiryInfo`, which will switch to `lastInboundMessageAt`.
- No direct changes; behavior comes from session-utils.

### 7. ChatList

**File**: `packages/dashboard-ui/components/agent-inbox/ChatList.tsx`
- Uses `getSessionExpiryInfo(session)` for `borderColorClass` and `isExpired`.
- No changes; both depend on session-utils.

## Edge Cases

| Case | Behavior |
|------|----------|
| Session with only outbound messages | `lastInboundMessageAt` null → `expiryAt` null → “24h window starts when customer sends a message”. Active, not expired. |
| Old sessions with null `lastInboundMessageAt` | Use `COALESCE(lastInboundMessageAt, lastMessageAt)` on backend for filters. |
| User sends message | `lastInboundMessageAt` updated → timer resets to 23h 59m. |
| Agent sends message | `lastInboundMessageAt` unchanged → timer does not reset. |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/dashboard-ui/lib/session-utils.ts` | Use 23h 59m window, base expiry on `lastInboundMessageAt`. |
| `packages/dashboard-ui/app/(dashboard)/agent-inbox/page.tsx` | `isSessionExpired` uses `lastInboundMessageAt` and 23h 59m cutoff. |
| `apps/dashboard-api/src/agent-system/inbox.service.ts` | Add expiry constant; switch active/expired filters to `lastInboundMessageAt` (with COALESCE fallback). |

## Files Unchanged

- `SessionExpiryTimer.tsx` – uses `getSessionExpiryInfo`
- `ChatList.tsx` – uses `getSessionExpiryInfo`
- Processor, inbox addMessage, collector – already set `lastInboundMessageAt` only on inbound
