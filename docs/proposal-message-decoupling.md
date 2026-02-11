# Proposal: Decoupling Messages from Inbox Sessions

## Problem
Currently, `MessageStorageService` enforces a strict dependency on `InboxSession`. If no active session (`ASSIGNED` or `UNASSIGNED`) exists for a contact, incoming messages (e.g., from CSAT flows or bot interactions post-resolution) are dropped. This leads to data loss in analytics and audit trails.

## Proposed Solution
We propose to allow messages to be stored even if no active session exists, by setting `sessionId` to `NULL`. The message will still be linked to the `Contact` via `contactId`.

### Implementation Steps
1.  **Modify `MessageStorageService.storeEvent`**:
    -   Remove the early `return` when `!session`.
    -   Instead of returning, log a debug message ("Storing message without session").
    -   Set `sessionId` to `null` in the `messageRepo.create` payload.
    -   Ensure `contactId` is correctly populated from `rawContactId`.

2.  **Expected Behavior**:
    -   **Inbox List**: These "orphaned" messages will **NOT** appear in the active inbox list (which queries `inbox_sessions`), preserving the "resolved" state.
    -   **Message History**: These messages will be stored in the database. When viewing a contact's history, they can be retrieved by querying `messages` where `contactId = ?` (regardless of `sessionId`).
    -   **Analytics**: We will have a complete record of all messages sent/received.

### Code Change Preview
```typescript
// apps/collector/src/capture/message-storage.service.ts

// ... session lookup ...
const session = await this.sessionHelper.getExistingSession(...);

if (!session) {
  this.logger.debug(
    `No inbox session for ${rawContactId}; storing message as ORPHAN (sessionId=null).`,
  );
  // Continue execution instead of returning
} else {
  // Update lastMessageAt only if session exists
  const now = new Date();
  await this.sessionRepo.update(session.id, { lastMessageAt: now });
}

// ...

// Ensure contact exists (this logic was duplicated inside the if(!session) block, needs to run always)
if (event.event_name === "message.received" && normalizedContactId) {
    await this.contactRepo.upsertFromMessageReceived(...);
}

// Create Message
const message = this.messageRepo.create({
  contactId: normalizedContactId, // Use the normalized ID
  sessionId: session ? session.id : null, // Handle null session
  // ... other fields
});

await this.messageRepo.save(message);
```

## Important Considerations
-   **Session Creation**: INBOUND messages without a session will NOT create a new session (preserving the current specialized handover logic). They will just be stored as orphan messages.
-   **Frontend**: To see these messages, the frontend chat history query might need to be updated to fetch by `contactId` globally, or we accept they are only visible in "All Messages" views (if implemented).
