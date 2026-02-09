# Agent Inbox & Contact Profile – Pre-Implementation Review

## Executive Summary

**Status:** ✅ **Phase 1 implemented** – The issues below were addressed. The inbox and contact profile are working. For the **current system** (inventory, layers, and consolidation plan, including future WebSockets), see **[Agent Inbox System Architecture](./agent_inbox_system_architecture.md)**.

**Issues that were fixed:**
1. Backend response shape – contact profile endpoints now return raw values (single wrap via ResponseInterceptor).
2. Message polling for open chat – 4s poll when a session is selected so inbound messages appear without manual refresh.
3. Contact profile/notes/history – frontend consumes single-wrapped data; notes and history display correctly.
4. Inbox list – 10s poll; fetch after accept/assign/transfer/resolve so list and counts stay in sync.

**This document** remains as the pre-implementation review; the architecture doc is the living reference for the consolidated system.

---

## Design Review (agent_inbox_realtime_and_contact_profile_design.md)

### Strengths ✅

| Aspect | Assessment |
|--------|------------|
| **Problem identification** | Thorough code review with specific file/line references |
| **Root cause analysis** | Correctly identifies double-wrap as core issue |
| **Phased approach** | Pragmatic: Phase 1 (polling) then optional Phase 2 (WebSocket/SSE) |
| **Response shape fix** | Option A (backend returns raw) is correct approach |
| **Targeted polling** | 4s poll for open chat is reasonable without new infrastructure |

### Design Decisions

| Decision | Rationale | Assessment |
|----------|-----------|------------|
| Backend returns raw value | Single wrap via ResponseInterceptor | ✅ Correct |
| Phase 1: Polling | No new infra, quick win | ✅ Good for MVP |
| 4s message poll | Balance latency vs load | ✅ Reasonable |
| 10s inbox poll | Existing behavior | ✅ Keep or increase to 15s |
| Phase 2: SSE/WS | Future optimization | ✅ Deferred appropriately |

---

## Current Implementation State

### Backend (dashboard-api)

**File:** `contact-profile.controller.ts`

```typescript
// Line 42 - ❌ Double-wrap issue still present
async getContact(...) {
  const contact = await this.contactProfileService.getContact(...);
  return { data: contact };  // ← Backend wraps
}
// ResponseInterceptor wraps again → { status, data: { data: contact }, timestamp }
```

**Similar issues:**
- `getNotes()` - Line 74: `return { data }`
- `addNote()` - Line 88: `return { data: note }`
- `getHistory()` - Lines 106-114: `return { data: result.data, total: result.total }`

### Frontend (dashboard-ui)

**File:** `app/(dashboard)/agent-inbox/page.tsx`

```typescript
// Lines 143-148 - Inbox polling ✅
useEffect(() => {
  fetchInbox();
  const interval = setInterval(fetchInbox, 10000);  // ✅ 10s poll
  return () => clearInterval(interval);
}, [fetchInbox]);

// Lines 150-164 - ❌ No message polling
const handleSelectSession = async (session: InboxSession) => {
  setSelectedSession(session);
  const data = await agentApi.getSession(session.id);  // ONE-TIME fetch
  setMessages(data.messages);
  // ❌ No interval for refreshing messages
};
```

**File:** `components/agent-inbox/ContactProfilePanel.tsx`

```typescript
// Lines 62-81 - ❌ Expects raw contact but gets { data: contact }
const fetchProfile = useCallback(async () => {
  const data = await agentApi.getContactProfile(...);
  setProfile(data);  // data is { data: contact }, not contact
  setEditName(data.name ?? "");  // ❌ undefined (should be data.data.name)
}, [contactId, contactName]);
```

---

## Implementation Gaps (Phase 1)

### 1.1 Backend Response Shape ❌

| Task | Status | Evidence |
|------|--------|----------|
| `getContact` return raw | ❌ | Line 42: `return { data: contact }` |
| `getNotes` return array | ❌ | Line 74: `return { data }` |
| `addNote` return note | ❌ | Line 88: `return { data: note }` |
| `getHistory` return raw | ❌ | Lines 106-114: `return { data: ..., total: ... }` |

### 1.2 Backend Notes Author/Date ⚠️

**Needs verification:**
- Does `getNotes` always return `authorName`?
- Is `createdAt` always ISO string?

### 1.3-1.4 Frontend Profile Panel ❌

**Issues:**
- Uses `data` as contact but it's `{ data: contact }`
- Notes set to `[]` because `Array.isArray({ data: notes[] })` is false
- History uses wrong properties

### 1.5 Open Chat Message Polling ❌

**Missing:**
- No interval when `selectedSessionId` is set
- No 4s poll for `agentApi.getSession(selectedSessionId)`

### 1.6 Inbox List Refresh ⚠️

**Needs verification:**
- Does `handleAcceptSession` call `fetchInbox()` after success?

---

## Recommendations

### Priority 1: Fix Response Shape (1.1-1.4)

**Backend changes:**

```typescript
// contact-profile.controller.ts

@Get(":contactId")
async getContact(...) {
  const contact = await this.contactProfileService.getContact(...);
  return contact;  // ← Remove wrapper
}

@Get(":contactId/notes")
async getNotes(...) {
  const notes = await this.contactProfileService.getNotes(...);
  return notes;  // ← Return array directly
}

@Post(":contactId/notes")
async addNote(...) {
  const note = await this.contactProfileService.addNote(...);
  return note;  // ← Return note object directly
}

@Get(":contactId/history")
async getHistory(...) {
  const result = await this.contactProfileService.getContactHistory(...);
  return { data: result.data, total: result.total };  // ← Keep this shape
}
```

**Frontend changes:**

```typescript
// ContactProfilePanel.tsx
const fetchProfile = useCallback(async () => {
  const data = await agentApi.getContactProfile(...);
  setProfile(data);  // Now data IS the contact
  setEditName(data.name ?? "");  // ✅ Works
}, [contactId, contactName]);

const fetchNotes = useCallback(async () => {
  const data = await agentApi.getContactNotes(...);
  setNotes(Array.isArray(data) ? data : []);  // Now data IS array
}, [contactId]);
```

### Priority 2: Add Message Polling (1.5)

```typescript
// agent-inbox/page.tsx

// Add state for message polling interval
const [messagePollInterval, setMessagePollInterval] = useState<NodeJS.Timeout | null>(null);

// Add effect to poll messages when session is selected
useEffect(() => {
  if (!selectedSession) {
    // Clear interval when no session selected
    if (messagePollInterval) {
      clearInterval(messagePollInterval);
      setMessagePollInterval(null);
    }
    return;
  }

  // Initial fetch
  const refreshMessages = async () => {
    try {
      const data = await agentApi.getSession(selectedSession.id);
      setMessages(data.messages);
    } catch (error) {
      console.error("Failed to refresh messages:", error);
    }
  };

  refreshMessages();

  // Poll every 4 seconds
  const interval = setInterval(refreshMessages, 4000);
  setMessagePollInterval(interval);

  return () => {
    clearInterval(interval);
    setMessagePollInterval(null);
  };
}, [selectedSession?.id]);
```

### Priority 3: Verify Accept Refresh (1.6)

Check if `handleAcceptSession` calls `fetchInbox()` after success. If not, add:

```typescript
const handleAcceptSession = async (sessionId: string) => {
  try {
    await agentApi.acceptSession(sessionId);
    toast.success("Session accepted");
    await fetchInbox();  // ← Add this
  } catch (error) {
    toast.error("Failed to accept session");
  }
};
```

---

## Testing Checklist

### Contact Profile

- [ ] Profile loads with correct name, dates, message count
- [ ] No "Invalid date" displayed
- [ ] Notes show author name (not "Unknown")
- [ ] Notes show valid timestamps
- [ ] Adding note appends correctly
- [ ] History loads and paginates

### Inbox Real-Time

- [ ] New assignment appears within 5s (via 10s poll)
- [ ] Open chat shows new inbound message within 5s (via 4s poll)
- [ ] Sent messages update optimistically then persist
- [ ] Accept session refreshes inbox list immediately

---

## Design Validation

### No Major Flaws Found ✅

The design document is sound:
- Phased approach is pragmatic
- Root cause analysis is accurate
- Proposed fixes are minimal and correct

### Minor Suggestions

1. **Inbox poll interval:** Consider increasing from 10s to 15s after adding message poll
2. **Error handling:** Add retry logic for message poll failures
3. **Optimistic updates:** Ensure message poll doesn't flicker during send
4. **Performance:** Monitor 4s poll impact; adjust interval if needed

### Phase 2 Considerations (Future)

When implementing SSE/WebSocket:
- Use JWT in query string or first message for auth
- Send events: `session.assigned`, `message.new`
- Client subscribes when inbox page is mounted
- Fallback to polling on connection failure
- Document reconnection strategy

---

## Conclusion

**Design Status:** ✅ **Approved** – No blocking issues found

**Implementation Status:** ✅ **Phase 1 done** – Response shape, message polling, accept/refresh, and contact profile fixes are in place. Additional improvements (media type inference, media persistence) are documented in the architecture doc.

**Next Steps (consolidation):**
1. Use [Agent Inbox System Architecture](./agent_inbox_system_architecture.md) as the single reference for layers, inventory, and future work.
2. Optional: extract hooks from inbox page (`useInboxPolling`, `useMessagePolling`), add unit/E2E tests.
3. When needed: add WebSocket/SSE as an additive real-time layer (see architecture doc §3.4).
