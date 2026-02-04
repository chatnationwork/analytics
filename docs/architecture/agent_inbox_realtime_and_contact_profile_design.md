# Agent Inbox: Real-Time Updates & Contact Profile – Requirements, Design & Implementation Plan

## 1. Overview

The agent inbox and contact profile in the dashboard are currently **poll-based and partly broken**. This document captures requirements, a unified design, and a phased implementation plan so that:

1. **Inbox** – Assigned chats appear as soon as they’re assigned; new messages (especially inbound replies) appear in the open chat without manual refresh.
2. **Contact profile panel** – Notes and history work correctly (no “Unknown” / “Invalid date”); data loading is consistent and reliable.

The goal is a **reliable and efficient** system, not necessarily a specific technology (e.g. WebSockets) unless it’s the best fit.

---

## 2. Current State (Findings from Code)

### 2.1 Agent Inbox Page (`packages/dashboard-ui/app/(dashboard)/agent-inbox/page.tsx`)

- **Session list:** Fetched once on mount and when filter changes; then **polled every 10 seconds** via `setInterval(fetchInbox, 10000)`.
- **Messages:** Loaded **once** when a session is selected (`handleSelectSession` → `agentApi.getSession(session.id)`). There is **no polling or push** for the open chat, so:
  - New assignments to this agent appear only on the next 10s poll.
  - When the contact replies, the new message is **not** shown until the user switches session and back, or the next inbox poll (which does not refetch messages for the current session).
- **Send message:** Optimistic update is correct; the sent message is replaced with the server response.
- **Presence:** Fetched once on mount; no real-time sync.

### 2.2 Backend: How Messages Get Into the Inbox

- **Processor** (`apps/processor`): Consumes analytics events; on `messages received` / `messages sent` it calls `syncToAgentSystem` → `processInboxMessage`, which writes to the inbox DB (sessions/messages). So **inbound messages are persisted** when events are processed; the gap is that the **UI does not refresh** the open chat when this happens.
- **Dashboard API:** No WebSocket or SSE. Inbox and session/messages are REST only.

### 2.3 Contact Profile Panel (`ContactProfilePanel.tsx`)

- **Profile:** Fetched via `agentApi.getContactProfile(contactId, contactName)`. Backend returns `{ data: contact }`; global `ResponseInterceptor` wraps again as `{ status, data: { data: contact }, timestamp }`. `fetchWithAuth` returns `json.data` → so the client gets **`{ data: contact }`**, not the contact itself. The component does `setProfile(data)`, so `profile` has a nested `data` and `profile.name` / `profile.firstSeen` etc. are **undefined**, which can surface as missing or “Invalid date” when formatting.
- **Notes:** Backend returns `{ data: notes[] }`; after interceptor, response is `{ status, data: { data: notes[] }, timestamp }`. `fetchWithAuth` returns `{ data: notes[] }`. The component does `setNotes(Array.isArray(data) ? data : [])`; `data` is the object `{ data: notes[] }`, so **notes are always set to []**. Added notes: `addContactNote` returns the same double-wrapped shape; the component appends the whole object (with `.data`) so each “note” in the list has the wrong shape; **authorName** comes from backend (relation `author`); if the relation fails or user is missing, it’s null → UI shows “Unknown”. **createdAt** is sent as ISO string from backend; if the client ever receives a non-ISO value (e.g. from a different code path), **Invalid date** can appear.
- **History:** Backend returns `{ data: result.data, total: result.total }`; after interceptor, response is `{ status, data: { data: array, total }, timestamp }`. `getContactHistory` uses `fetchWithAuthFull` and then `return { data: res?.data ?? [], total: res?.total ?? 0 }`. Here `res.data` is **`{ data: array, total }`**, not the array, so the client ends up with **wrong or empty history** and wrong total. So history often “does not show”.

### 2.4 Root Causes Summary

| Area | Root cause |
|------|------------|
| Inbox list | Polling only every 10s; no push when a session is assigned to this agent. |
| Open chat messages | No refresh after load; inbound replies are never fetched until user re-selects the session. |
| Contact profile | Controller returns `{ data: x }`; interceptor wraps again; frontend uses `fetchWithAuth` and treats `json.data` as the entity, but that is still the controller’s `{ data: x }`. |
| Notes | Same double-wrap; frontend expects an array and gets an object → empty list; added note shape wrong; author/date fallbacks missing. |
| History | Same double-wrap; frontend reads `res.data` (object) and `res.total` (undefined) instead of `res.data.data` and `res.data.total`. |

---

## 3. Requirements

### 3.1 Functional

- **R1 – New assignments:** When a session is assigned to the current agent (handover or queue assignment), it appears in the agent’s inbox **within a few seconds** (target &lt; 5s without manual refresh).
- **R2 – New messages in open chat:** When the agent has a conversation open and the contact (or system) sends a message, that message appears in the chat **within a few seconds** (target &lt; 5s).
- **R3 – Sent messages:** Keep current behaviour: optimistic update, then replace with server response (no regression).
- **R4 – Contact profile:** Profile tab shows correct name, dates (first/last seen), and message count; no “Invalid date”.
- **R5 – Notes:** Notes list shows all notes; each note shows author (name or fallback “Agent”) and a valid date/time; adding a note appends one correctly shaped item.
- **R6 – History:** History tab shows audit entries for the contact (profile updates, etc.) with correct actor and date; pagination works.

### 3.2 Non-Functional

- **NF1 – Consistency:** One clear pattern for “when to refetch / when to push” so the system is easy to reason about and extend.
- **NF2 – Efficiency:** Prefer pushing only when something changed (or short-interval poll for open chat) instead of heavy full-list polling where not needed.
- **NF3 – Resilience:** If real-time channel fails (e.g. WebSocket disconnect), fall back to polling or reconnection without leaving the UI stuck.

---

## 4. Design

### 4.1 Response Shape (Contact Profile, Notes, History)

**Option A – Backend returns raw value (recommended)**  
Controllers return the **entity or payload** directly (e.g. `return contact`, `return notes`, `return { data: list, total }`). The global `ResponseInterceptor` already wraps in `{ status, data, timestamp }`, so the client gets a single wrap. Then:

- `fetchWithAuth` → `data` is the contact / array / etc.
- `fetchWithAuthFull` → `data` is `{ data: list, total }` for history.

No double-wrap; frontend code can assume “data = payload”.

**Option B – Keep controller `{ data }` and unwrap on frontend**  
Every contact-profile API client strips one level (e.g. `(res) => res?.data ?? res`) so the component always receives the inner payload. This is more fragile (easy to forget for new endpoints).

**Decision:** **Option A.** Change contact-profile controllers to return the value directly (contact, array, or `{ data, total }`). No change to interceptor. Update frontend to assume a single wrap (already the case for `fetchWithAuth`/`fetchWithAuthFull` once backend is fixed).

### 4.2 Real-Time / Near-Real-Time Strategy

**Options:**

1. **WebSockets** – Full duplex; server can push “session assigned” and “new message” per agent. Requires a new WS endpoint, auth, and connection management; scales well and gives the best UX.
2. **SSE (Server-Sent Events)** – Server pushes events (e.g. “inbox updated”, “messages updated for session X”). Simpler than WebSockets (one-way), no new connection protocol on client beyond `EventSource`.
3. **Targeted polling** – Keep REST; add a **short-interval poll only for the open session’s messages** (e.g. every 3–5s when a chat is selected) and optionally keep or slightly increase inbox list poll (e.g. 10s). No new infrastructure; simpler; slightly higher latency and more requests.

Given “reliable and efficient” and that the codebase has no existing real-time layer, a **phased** approach is recommended:

- **Phase 1 (quick win):** Fix contact profile/notes/history (response shape + UI). Add **targeted polling** for the open chat (poll messages for `selectedSessionId` every 3–5s while the chat is open). Optionally reduce or keep inbox list poll (e.g. 10s). This delivers R2 and R4–R6 without new infra.
- **Phase 2 (optional):** Introduce **SSE or WebSocket** for “inbox updated” and “new message for session X” so that assigned chats and new messages appear without polling; then remove or lengthen the relevant polls.

Design below assumes **Phase 1** as the first deliverable; Phase 2 can be a follow-on design (channel format, auth, reconnection).

### 4.3 Inbox List Updates (Phase 1)

- Keep **polling** for the session list (e.g. every 10s) when the inbox is visible.
- Ensure that when the user **accepts** a session or the backend assigns one, the next poll (or an immediate `fetchInbox()` after accept) updates the list so the new/updated session appears. No change required if we already call `fetchInbox()` after accept; otherwise add it.
- No WebSocket/SSE in Phase 1.

### 4.4 Open Chat Messages (Phase 1)

- When `selectedSessionId` is set, start a **short-interval poll** (e.g. every 4s) that calls `agentApi.getSession(selectedSessionId)` and updates `messages` (and optionally session metadata like `lastMessageAt`).
- When the user sends a message, keep **optimistic update**; after the API returns, merge the server message into state (already done). The next poll will also bring the latest list.
- When `selectedSessionId` is cleared, clear the poll (no need to poll when no chat is open).
- This satisfies R2 with minimal change and no new backend endpoints.

### 4.5 Contact Profile Panel (All Phases)

- **Backend:**  
  - `GET :contactId` → return `contact` (the DTO) directly.  
  - `GET :contactId/notes` → return `notes` array directly.  
  - `POST :contactId/notes` → return the created `note` object directly.  
  - `GET :contactId/history` → return `{ data: entries, total }` directly (interceptor will wrap once).
- **Frontend:**  
  - Assume `fetchWithAuth` returns the single-wrapped `data`: contact, array, or (for history) use `fetchWithAuthFull` and then use `res.data` as `{ data: entries, total }`.  
  - Notes: Ensure each note has `authorName: string` (fallback to `"Agent"` if null) and `createdAt` as ISO string; in the UI, use a safe date formatter (e.g. only format if valid date).  
  - History: Use `res.data.data` and `res.data.total` until backend is changed; after backend change, `res.data` will be `{ data, total }` from the single wrap.

This fixes R4, R5, R6.

### 4.6 Notes “Unknown” and “Invalid date”

- **Backend:** Ensure notes API always returns `authorName` (resolve `author` relation; if missing, set to `"Agent"`) and `createdAt` as ISO string.
- **Frontend:** Use a single `formatDate(iso)` that returns a sensible fallback (e.g. `"Invalid date"` → show raw string or “—”) so we never show “Invalid date” as-is; and use `note.authorName ?? "Agent"` for display.

---

## 5. Implementation Plan

### Phase 1 – Contact Profile Fixes & Targeted Message Polling (No New Real-Time Infra)

| Step | Task | Owner / Notes |
|------|------|----------------|
| 1.1 | **Backend: Contact profile response shape** | |
| | In `ContactProfileController`: `getContact` return `contact` (not `{ data: contact }`). | |
| | `getNotes` return the array (not `{ data }`). | |
| | `addNote` return the note object (not `{ data: note }`). | |
| | `getHistory` return `{ data: result.data, total: result.total }` (same shape, but it’s the only return; interceptor wraps once). | |
| 1.2 | **Backend: Notes author and date** | |
| | In `ContactProfileService.getNotes` and `addNote`, ensure `authorName` is never null when returning (e.g. `author?.name ?? "Agent"`). | |
| | Ensure `createdAt` is always ISO string. | |
| 1.3 | **Frontend: Agent API contact profile** | |
| | `getContactProfile`: after `fetchWithAuth`, return value is the contact (single wrap). If any legacy double-wrap remains, add `(res) => res?.data ?? res` until backend is deployed. | |
| | `getContactNotes`: return array; if response is object with `data`, use `(res) => Array.isArray(res) ? res : (res?.data ?? [])`. | |
| | `addContactNote`: return the note object; same unwrap if needed. | |
| | `getContactHistory`: use `fetchWithAuthFull`; after backend change, `res.data` is `{ data, total }`; return `{ data: res.data?.data ?? [], total: res.data?.total ?? 0 }`. | |
| 1.4 | **Frontend: ContactProfilePanel** | |
| | Use `profile` as the contact object (no `.data`). | |
| | Notes: display `note.authorName ?? "Agent"` and safe date format (fallback for invalid). | |
| | History: consume `{ data, total }` from API; ensure pagination uses `total`. | |
| 1.5 | **Frontend: Open chat message polling** | |
| | In agent-inbox page, when `selectedSessionId` is set, start an interval (e.g. 4s) that calls `agentApi.getSession(selectedSessionId)` and sets `messages` from the response. | |
| | Clear the interval when `selectedSessionId` is null or on unmount. | |
| | Preserve optimistic updates for send; avoid flicker (e.g. merge by id, or replace list and keep optimistic id until server confirms). | |
| 1.6 | **Frontend: Inbox list** | |
| | Ensure after accept/assign we call `fetchInbox()` so the list updates (already may be there; verify). Keep 10s poll or reduce to 15s if desired. | |
| 1.7 | **Tests & manual QA** | |
| | Manual: profile loads, notes show author/date, history shows and paginates; open chat gets new messages within a few seconds. | |

### Phase 2 (Optional) – Push-Based Real-Time

- Add an **SSE or WebSocket** channel (e.g. `/api/dashboard/agent/inbox/events`) with auth (e.g. JWT in query or first message).
- Server emits events when: (1) a session is assigned to the current agent, (2) a new message is added to a session the agent has open. Client subscribes when the inbox is open; on event, refetch inbox or messages for the relevant session.
- After rollout, remove or lengthen the inbox and/or message polls.
- Document in a separate “Agent Inbox Real-Time (Phase 2)” note: event schema, reconnection, and fallback to polling.

---

## 6. Summary

| Problem | Cause | Fix (Phase 1) |
|--------|--------|----------------|
| New assignments not visible soon | Only 10s poll | Keep poll; ensure fetch after accept; optional Phase 2 push. |
| New messages in open chat not visible | No refresh after load | Poll messages for selected session every 4s. |
| Profile/notes/history broken | Double-wrap + wrong client unwrap | Backend return raw value; frontend use single wrap; fix history `data`/`total` handling. |
| Notes “Unknown” / “Invalid date” | authorName null; date format edge case | Backend fallback “Agent”; frontend safe formatter and author fallback. |

Phase 1 gives a **reliable and efficient** inbox and contact profile without new infrastructure; Phase 2 can add push for lower latency and fewer requests.
