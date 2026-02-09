# Expired Chats and Reconnection – Current Behavior and Decisions

This doc answers: **How do we handle expired chats, and when we receive a message (e.g. “Connect to agent”), is it treated like an active assigned chat or something else?** It is the reference for deciding what to fix.

---

## 1. How “expired” is defined

- **Expired** is not a separate session status. The session is still **ASSIGNED** to the same agent.
- **Expired** is a **filter**: “assigned to this agent **and** `lastMessageAt` is older than 24 hours.”
- So: same session, same assignment; we only classify it as “expired” for the inbox tabs (Active vs Expired).

Definitions (from `inbox.service.ts`):

| Filter   | Meaning |
|----------|--------|
| **Active (pending)** | Assigned + accepted + `lastMessageAt` within last 24h (or null). |
| **Expired**          | Assigned + `lastMessageAt` older than 24h. |
| **Resolved**         | Status = RESOLVED. |

---

## 2. What happens when we receive a new message for that contact

When an inbound message is processed by our system, this is what runs:

1. **Processor** handles a `message.received` (or `message.sent`) event.
2. It calls **getOrCreateSession(tenantId, contactId, …)**.
   - The helper looks for an **existing** session for that contact with status **ASSIGNED or UNASSIGNED** and reuses it.
   - So the **expired** session (still ASSIGNED) is the one that gets reused.
3. Processor **updates** that session: `lastMessageAt = now`.
4. It then saves the new message to the **messages** table.

So **by design**, when we receive a new inbound message for a contact that has an expired session:

- We **reuse the same session** (no new session, no reassignment).
- We **refresh `lastMessageAt`** to now.
- The session then satisfies “last message within 24h” and is classified as **active**, so it **should** appear under **Active** in the agent’s inbox, not only under Expired.

So: **an expired chat is treated like an active assigned chat again as soon as we process a new inbound message** – same session, same agent, and we only change the “last activity” time so the UI moves it from Expired to Active.

---

## 3. Why “Connect to agent” might not show in the agent inbox

For the above to happen, the user’s action must reach our pipeline as a **message event** that the processor handles:

- Flow: **User sends “Connect to agent” (or taps a button) in WhatsApp** → **some system (e.g. bot/Chatnation)** must send a **message.received** (or equivalent) event to our **Collector** (e.g. `POST /v1/capture`) with the correct `userId`/contact and payload.
- **Processor** then runs `processInboxMessage` for that event, calls `getOrCreateSession`, updates `lastMessageAt`, and saves the message.

If “Connect to agent” is:

- Handled only inside the bot (e.g. triggers a template or handover) but **never** sent to our capture as `message.received`, then our processor **never** runs, we never update `lastMessageAt`, and the session **stays** expired. The agent won’t see it under Active.

So the most likely reason “Connect to agent” doesn’t show in the agent inbox is: **those user messages (or button taps) are not being sent to our analytics/capture as `message.received` events**, so we never “see” the new message and never refresh the session.

---

## 4. What the “Re-engage” button does today

- The **Re-engage** button in the inbox calls `POST /agent/inbox/:sessionId/reengage`.
- That endpoint **only** sends the WhatsApp re-engagement **template** to the contact (e.g. “Our agents are available for re-engagement – Connect to Agent”).
- It does **not**:
  - Update `lastMessageAt`, or
  - Change session status, or
  - Call `addMessage` for that template in our DB.

So after the agent clicks Re-engage, the session **remains expired** in our system until we process a **new inbound message** (e.g. user reply) that comes in as `message.received`.

---

## 5. Decisions to make before “fixing”

Clarifying these will tell us what to implement.

### 5.1 When should an expired chat become “active” again?

**Option A – Only when we receive a new user message (current design)**  
- A new **inbound** message (that we receive as `message.received`) → update `lastMessageAt` → session becomes active.  
- **Requirement:** Every user message (including “Connect to agent” or the result of tapping “Connect to Agent” in the bot) must be sent to our capture as `message.received` so the processor can run.

**Option B – Also when the agent sends re-engage**  
- When the agent clicks Re-engage, we could also set `lastMessageAt = now` (and optionally store the template as an outbound message). Then the session becomes “active” immediately and appears under Active so the agent can continue the conversation.  
- Product question: Should “agent sent re-engage” count as “activity” that moves the chat back to Active?

**Option C – Dedicated “chat reopened” / “connect to agent” event**  
- Upstream sends a special event (e.g. `chat.reopened` or a `message.received` with a specific type) when the user asks to connect to an agent. We then update the session (e.g. `lastMessageAt`) and optionally run assignment/handover logic.  
- This still requires the upstream to send **something** to our system when “Connect to agent” happens.

### 5.2 Where do “Connect to agent” messages come from?

- Need to confirm: when the user types “Connect to agent” or taps “Connect to Agent” in the bot, **who** receives it (Chatnation, bot, WhatsApp API) and **does that system send a `message.received` (or equivalent) to our Collector?**
- If **no**, the fix is upstream: ensure those actions generate an event that our pipeline processes.
- If **yes**, the fix may be in our processor (e.g. contactId, tenantId, or event shape) or in how we classify sessions (e.g. ensure we don’t exclude this contact/session from the active list).

### 5.3 Summary

| Question | Current behavior | Decision needed |
|----------|------------------|------------------|
| Is an expired chat a different “state” or just a filter? | Just a filter (same ASSIGNED session, 24h inactive). | None – keep as is. |
| When we receive a new message for an expired session, do we treat it as active? | Yes – we reuse the session and set `lastMessageAt = now`, so it becomes active. | None – design is correct. |
| Why doesn’t “Connect to agent” show? | Likely: those messages are not sent to our system as `message.received`. | Confirm upstream and fix: either send events to capture, or add a dedicated “reopen” path. |
| Should Re-engage button also make the session active? | No – today it only sends the template. | Decide: Option B (update `lastMessageAt` on re-engage) or keep as is. |

---

## 6. Recommended next steps

1. **Confirm event flow:** When the user says “Connect to agent” or taps the button, does our Collector receive a `message.received` (or similar) for that contact? (Check Collector logs or events table for that contact around the time of the attempt.)
2. **If no event:** Fix upstream so that “Connect to agent” (or the button) results in an event sent to our capture; then the existing processor logic will make the session active again.
3. **If events exist but session doesn’t become active:** Debug processor (getOrCreateSession, lastMessageAt update, and inbox query filters).
4. **Product decision:** Do we want the Re-engage button to also update `lastMessageAt` (and optionally store the template as a message) so the session moves to Active immediately? If yes, implement that in the reengage endpoint.

Once these are decided, the code changes (upstream and/or our reengage endpoint and/or processor) are straightforward.
