# Agent Inbox System – Architecture & Consolidation

This document describes the **current** agent inbox system (files, classes, functions), then proposes a **consolidated architecture** for maintainability, extensibility, and future WebSocket support. No code changes are prescribed here; this is the reference for turning the working inbox into a clear “system.”

Related docs:
- [Agent Inbox: Real-Time & Contact Profile Design](./agent_inbox_realtime_and_contact_profile_design.md) – Original requirements and Phase 1/2 plan.
- [Agent Inbox Implementation Review](./agent_inbox_implementation_review.md) – Pre-implementation review; many items are now done.

---

## 1. Current System Inventory

### 1.1 Frontend (dashboard-ui)

| File | Exports / key symbols | Purpose |
|------|------------------------|---------|
| **Page** | | |
| `app/(dashboard)/agent-inbox/page.tsx` | `AgentInboxPage` (default), `FILTER_TABS_AGENT`, `FILTER_TABS_SUPER_ADMIN` | Inbox page: session list, filter tabs, chat area, contact panel toggle. State: `sessions`, `selectedSessionId`, `messages`, `currentSessionDetail`, `acceptedSessions`, `filter`, dialogs, permissions. Handlers: `fetchInbox`, `handleSelectSession`, `handleSendMessage`, `handleAcceptSession`, `handleResolveSession`, `handleTransferSession`, `handleReengage`, `isSessionExpired`, `getCountForFilter`. Polling: inbox every 10s, messages for open chat every 4s. |
| **Components** | | |
| `components/agent-inbox/ChatList.tsx` | `ChatList` | Renders session list with selection, bulk selection, expired state. |
| `components/agent-inbox/ChatWindow.tsx` | `ChatWindow`, `ChatTimelineItem`; helpers: `getMessageBody`, `getMediaUrl`, `isLikelyImageUrl`, `MessageBubbleContent`, `buildTimeline`, `formatTimelineTime` | Conversation timeline: system events, message bubbles (text, image, video, audio, document, location). |
| `components/agent-inbox/MessageInput.tsx` | `MessageInput` | Text input + send; integrates `AttachmentMenu`. |
| `components/agent-inbox/AttachmentMenu.tsx` | `AttachmentMenu` | Image/video/audio/document/location picker; uploads via `uploadMedia`, builds `SendMessagePayload`. |
| `components/agent-inbox/ResolveDialog.tsx` | `ResolveDialog` | Resolve dialog: category, notes, optional wrap-up form from team config. |
| `components/agent-inbox/TransferDialog.tsx` | `TransferDialog` | Transfer to agent: agent list, reason (optional per tenant). |
| `components/agent-inbox/SessionExpiryTimer.tsx` | `SessionExpiryTimer` | Shows “Expires in Xh Ym” for 24h window; re-engage CTA when expired. |
| `components/agent-inbox/ContactProfilePanel.tsx` | `ContactProfilePanel`, `ContactProfilePanelProps`; `formatDate` | Contact profile (name, first/last seen, message count), notes list, history (audit) with pagination. |
| **API client** | | |
| `lib/api/agent/index.ts` | Types: `InboxSession`, `Message`, `SendMessagePayload`, `InboxFilter`, `AgentInboxCounts`, `TenantInboxCounts`, `SessionTransfer`, `Team`, `TeamMember`, `TeamWrapUpReport`, `AvailableAgent`, `ContactProfile`, `ContactNote`, `ContactHistoryEntry`, etc. Functions: `uploadMedia`. Object: `agentApi` with `getInbox`, `getInboxCounts`, `getUnassigned`, `assignQueue`, `getSession`, `sendMessage`, `resolveSession`, `acceptSession`, `sendReengagement`, `transferSession`, `bulkTransferSessions`, `getAvailableAgents`, `getPresence`, `setPresence`, teams CRUD, `getContactProfile`, `updateContactProfile`, `getContactNotes`, `addContactNote`, `getContactHistory`, etc. | Single agent/inbox/contact API surface. |

### 1.2 Backend – Agent system (dashboard-api)

| File | Classes / key functions | Purpose |
|------|-------------------------|---------|
| **Inbox (core)** | | |
| `src/agent-system/agent-inbox.controller.ts` | `AgentInboxController`: `getInbox`, `getPresence`, `setPresence`, `getInboxCounts`, `getUnassigned`, `assignQueue`, `getSession`, `reengage`, `sendMessage`, `acceptSession`, `resolveSession`, `bulkTransfer`, `transferSession`, `getAvailableAgents`; private `resolveMediaUrl`, `buildWhatsAppPayload`, `messageDisplayFromDto` | REST for inbox list, session+messages, send, accept, resolve, transfer, presence, queue assignment. |
| `src/agent-system/inbox.service.ts` | `InboxService`: `getOrCreateSession`, `addMessage`, `getAgentInbox`, `getAgentInboxCounts`, `getTenantInboxCounts`, `getTenantInbox`, `getUnassignedSessions`, `getSessionMessages`, `getMessagesForContact`, `hasActiveAgentSession`, `contactHasAssignedSession`, `getSession`, `assignSession`, `resolveSession`, `transferSession`, `bulkTransferSessions`, `getAvailableAgentsForTransfer`; types `InboxFilter`, `CreateMessageDto` | Session/message CRUD, assignment, resolve, transfer; single source of inbox business logic. |
| **Contact profile** | | |
| `src/agent-system/contact-profile.controller.ts` | `ContactProfileController`: `getContact`, `updateContact`, `getNotes`, `addNote`, `getHistory`, `getResolutions` | REST for contact profile, notes, audit history, resolutions. |
| `src/agent-system/contact-profile.service.ts` | `ContactProfileService`: `getContact`, `updateContact`, `getNotes`, `addNote`, `getContactHistory`, `getContactResolutions`; DTOs `ContactProfileDto`, `UpdateContactProfileDto`, `ContactNoteDto`, `ContactHistoryEntryDto`, `ContactResolutionDto` | Contact + notes + history + resolutions logic. |
| **Media (inbox attachments)** | | |
| `src/media/media.controller.ts` | `MediaController`: `upload` (POST), `serve` (GET :filename) | Upload file → public URL; serve by filename (no auth for WhatsApp fetch). |
| `src/media/media.service.ts` | `MediaService`: `saveFile`, `getPublicUrl`, `getFilePath`, `exists`, `createReadStream`, `getMimeType` | Disk storage under `media.uploadsDir`; URL from `media.publicBaseUrl`. |
| **Assignment & presence** | | |
| `src/agent-system/assignment.service.ts` | `AssignmentService`: `assignSession`, `getStrategyWithType`, `getAvailableAgents`, `pickAgentForSession`, `runNoAgentFallback`, `requestAssignment`, `assignQueuedSessionsToAvailableAgents`, `assignQueuedSessionsToAgents`, `assignQueuedSessionsToTeams`, `getTeamsAvailableForQueue`, `checkScheduleAvailability`; type `AssignmentStrategy` | Routing strategies (round_robin, least_active, etc.), queue assignment. |
| `src/agent-system/assignment.scheduler.ts` | `AssignmentScheduler`: `processUnassignedSessions` | Periodic job: assign unassigned sessions to agents. |
| `src/agent-system/assignment-engine/*` | `AssignmentEngine`, rules (`scheduleRule`, `strategyRule`, `selectorRule`, `contactAlreadyAssignedRule`, `eligibilityRule`, `runNoAgentFallback`), `RedisRoundRobinContextProvider`, `InMemoryRoundRobinContextProvider`, types | Rule-based assignment pipeline. |
| `src/agent-system/presence.service.ts` | `PresenceService`: `goOnline`, `goOffline`, `getStatus` | Agent presence (online/offline). |
| **Other agent-system** | | |
| `src/agent-system/agent-system.module.ts` | `AgentSystemModule` | Wires TypeORM entities, controllers, services, assignment engine, RBAC, WhatsApp, Audit. |
| `src/agent-system/agent-session.controller.ts` | `AgentSessionController`: `checkActiveSession` | Check if agent has an active session (e.g. before wrap-up). |
| `src/agent-system/agent-status.controller.ts` | `AgentStatusController`: `getAgentStatusList`, `setAgentPresence`, `getSessionHistory` | Agent status list and session history. |
| `src/agent-system/integration.controller.ts` | `IntegrationController`: `handover` | External handover (e.g. bot → agent). |
| `src/agent-system/team.controller.ts` | `TeamController`: list, get, create, update, setDefault, disable, enable, delete, getMembers, addMember, disable/enable/remove/updateMember, getTeamsAvailableForQueue, getQueueStats, getAvailableMembersForTeam | Teams CRUD and queue/assignment. |

### 1.3 Backend – Processor (inbox ingestion)

| File | Classes / key functions | Purpose |
|------|-------------------------|---------|
| `apps/processor/src/event-processor/event-processor.service.ts` | `EventProcessorService`: `syncToAgentSystem`, `processInboxMessage` | Consumes analytics events; for message.received / message.sent calls `processInboxMessage`: get/create session via `InboxSessionHelper`, infer type from `media_url`/props, write `MessageEntity` + update session `lastMessageAt`. |

### 1.4 Database & shared (libs/database)

| File | Exports | Purpose |
|------|---------|---------|
| `entities/inbox-session.entity.ts` | `InboxSessionEntity`, `SessionStatus` | Inbox sessions (contactId, status, assignedAgentId, assignedTeamId, context, lastMessageAt, acceptedAt, etc.). |
| `entities/message.entity.ts` | `MessageEntity`, `MessageDirection`, `MessageType` | Messages (contactId, sessionId, tenantId, direction, type, content, metadata, senderId, externalId). |
| `entities/contact.entity.ts` | `ContactEntity` | Contact (contactId, name, firstSeen, lastSeen, messageCount, tenantId). |
| `entities/contact-note.entity.ts` | `ContactNoteEntity` | Contact notes (tenantId, contactId, authorId, content, createdAt). |
| `entities/resolution.entity.ts` | `ResolutionEntity` | Resolution per session (category, notes, outcome, resolvedByAgentId, csatScore, etc.). |
| `helpers/inbox-session.helper.ts` | `InboxSessionHelper`, `GetOrCreateSessionOptions` | getOrCreateSession (normalize contactId, reuse ASSIGNED/UNASSIGNED, dedup race, optional default team assignment). |
| `utils/canonical-contact-id.ts` | `normalizeContactIdDigits` | Digits-only contact ID. |
| `repositories/contact.repository.ts` | Contact repository (used by contact profile, processor) | Contact CRUD. |
| `repositories/audit-log.repository.ts` | Audit log listing | Contact history (audit entries). |

### 1.5 Proxy & config

| File | Key symbols | Purpose |
|------|-------------|---------|
| `packages/dashboard-ui/app/api/[...path]/route.ts` | `GET/POST/PUT/PATCH/DELETE`, `proxyRequest` | Next.js API route: proxy all methods to backend; forward cookies (JWT); binary-safe (arrayBuffer for non-JSON); response Content-Type preserved for media. |
| `libs/common/src/config/index.ts` | `mediaConfig` (media.uploadsDir, media.publicBaseUrl, media.maxFileSizeBytes) | Media upload path and public base URL. |

### 1.6 External dependencies (inbox-relevant)

- **Auth:** JWT in cookie; `JwtAuthGuard` on upload; proxy sends cookie to backend.
- **WhatsApp:** `WhatsappService` used by agent-inbox controller to send messages (image/video/audio/document/text/template).
- **Audit:** `AuditService` / audit log for contact history and resolution logging.
- **RBAC:** Permissions (e.g. session.view_all, session.transfer, session.bulk_transfer) drive filter tabs and actions.

---

## 2. Current Data Flow (Summary)

- **Inbound message:** External system (e.g. WhatsApp) → analytics event (e.g. message.received) → Collector → Redis → Processor → `processInboxMessage` → InboxSessionHelper + MessageEntity. UI sees it via 4s message poll for open session.
- **Outbound message:** UI → sendMessage (optimistic) → proxy → AgentInboxController → InboxService.addMessage + WhatsApp send; UI replaces optimistic with server message.
- **Inbox list:** UI polls getInbox every 10s; counts from getInboxCounts (React Query).
- **Contact profile:** UI → getContactProfile / getContactNotes / getContactHistory → ContactProfileController → ContactProfileService (+ Audit for history).
- **Media:** Upload: UI → proxy → MediaController.upload → MediaService.saveFile (disk) → return public URL. Serve: GET /api/dashboard/media/:filename → MediaService.serve (no auth). Persistence: Docker volume `media_uploads` for /app/uploads/media.

---

## 3. Consolidation Proposal

Goal: Turn the working inbox into a **clearly layered, easy-to-maintain and extend** system, with a **clear place for future WebSockets** and consistent naming.

### 3.1 Principles

1. **Single responsibility per layer** – UI → API client → REST → service → repository/entity. No business logic in controllers beyond mapping and auth.
2. **One place for “inbox” semantics** – Session lifecycle, filters, message semantics (including media type inference) live in backend services; UI and processor depend on the same contracts (DTOs/types).
3. **Real-time as an additive layer** – Keep current REST + polling as the default; add WebSocket (or SSE) as an optional channel that *triggers* the same refetch/merge logic the UI already uses (no duplicate business logic).
4. **Document boundaries** – Clear “inbox core” vs “assignment” vs “contact profile” vs “media” so new features (e.g. typing indicators, read receipts) have an obvious home.

### 3.2 Proposed logical layers (no file moves yet)

| Layer | Responsibility | Current location |
|-------|----------------|------------------|
| **Presentation** | Inbox page, chat list, chat window, message input, attachments, resolve/transfer dialogs, contact panel, session expiry | `dashboard-ui`: page + components/agent-inbox |
| **API client** | Types + single `agentApi` object for inbox, session, message, contact, teams, presence | `dashboard-ui/lib/api/agent/index.ts` |
| **Gateway** | Proxy to backend; binary-safe; auth via cookie | `dashboard-ui/app/api/[...path]/route.ts` |
| **REST (inbox)** | Inbox, session, message, accept, resolve, transfer, presence, queue assignment | `dashboard-api`: AgentInboxController, InboxService |
| **REST (contact)** | Contact profile, notes, history, resolutions | ContactProfileController, ContactProfileService |
| **REST (media)** | Upload, serve by filename | MediaController, MediaService |
| **Assignment** | Routing rules, scheduler, strategies | AssignmentService, AssignmentEngine, AssignmentScheduler |
| **Ingestion** | Events → sessions + messages | Processor: syncToAgentSystem, processInboxMessage |
| **Domain** | Sessions, messages, contacts, notes, resolutions; session helper | libs/database: entities, InboxSessionHelper |
| **Real-time (future)** | Push “inbox updated” / “new message for session X” | New: e.g. WebSocket gateway + handler that reuses same service APIs |

### 3.3 Naming and boundaries

- **“Inbox”** = session list + filters + counts + “open session” (session + messages). Keep `getInbox`, `getSession`, `sendMessage`, `acceptSession`, `resolveSession`, `transferSession`, presence, assign-queue under one controller/service pair (already the case).
- **“Contact profile”** = contact entity, notes, audit history, resolutions for a contact. Keep separate controller/service (already the case); ensure DTOs and response shapes are documented in one place (this doc + OpenAPI or a small spec file).
- **“Media”** = upload + serve for agent attachments; persistence (volume) and URL shape are config-driven. No need to mix with inbox logic beyond “message has media_url”.
- **Processor “inbox” path** = single method `processInboxMessage` (and helper usage) so that all event → inbox writes go through one place; media type inference from `media_url` already lives there.

### 3.4 Future WebSocket (or SSE) – where it fits

- **Additive:** New endpoint (e.g. `/api/dashboard/agent/inbox/events` or a WebSocket path) that:
  - Authenticates (e.g. JWT from cookie or first message).
  - Subscribes the current user to “inbox events” (and optionally “messages for session X”).
- **Server:** On “session assigned to agent” or “new message for session” (from existing Processor or InboxService), emit an event over the channel (e.g. `{ type: "inbox.updated" }` or `{ type: "message.new", sessionId }`). No new business logic: same DB writes as today; event is a side effect.
- **Client:** On event, call existing `fetchInbox()` and/or refresh messages for the open session (same as current poll path). Optionally back off or stop polling when connected; fall back to polling when disconnected.
- **Documentation:** One short “Real-time” section in this doc (or a sibling doc) describing event types, auth, and fallback. No duplication of session/message semantics.

### 3.5 Reliability and maintainability

- **Persistence:** Media already persisted via Docker volume; ensure all environments that run dashboard-api use a persistent path (or object storage) for uploads.
- **Idempotency:** Message creation in processor uses event/session/message semantics; keep externalId/deduplication as today to avoid duplicates.
- **Errors:** Keep controller → service → repository boundaries; avoid swallowing errors in the proxy (already returning backend status).
- **Testing:** Unit tests for InboxService (getAgentInbox, getSession, addMessage, resolve, transfer), ContactProfileService, and Processor’s processInboxMessage; E2E for “open inbox → select chat → send message → resolve” and “contact profile loads”.
- **Docs:** This doc + design doc + implementation review; add a one-page “Inbox API” summary (list of endpoints and main DTOs) for new contributors.

### 3.6 What to do next (recommended order)

1. **Freeze behavior, document contracts** – Publish this architecture doc; add a short “Inbox API summary” (endpoints + main request/response shapes) under `docs/` or in this file. No code change.
2. **Optional refactors** – If desired: extract small hooks from the inbox page (e.g. `useInboxPolling`, `useMessagePolling`, `useInboxCounts`) to slim the page and make the “system” boundaries clearer; keep all handlers in one place or in a custom hook used only by the page.
3. **Real-time** – When needed: implement WebSocket (or SSE) as above; document event schema and fallback; keep REST + polling as default.
4. **Tests** – Add/expand unit tests for InboxService and processInboxMessage; add E2E for critical inbox and contact profile flows.

---

## 4. Inbox API Summary (quick reference)

- **GET** `/agent/inbox?filter=` – List sessions (filter: all | assigned | unassigned | pending | resolved | expired).
- **GET** `/agent/inbox/counts` – Counts per filter (agent vs tenant shape by permission).
- **GET** `/agent/inbox/unassigned?teamId=` – Unassigned sessions (optional team).
- **POST** `/agent/inbox/assign-queue` – Assign queue (body: mode, teamId, assignments, teamIds).
- **GET** `/agent/inbox/:sessionId` – Session + messages.
- **POST** `/agent/inbox/:sessionId/message` – Send message (body: content, type, media_url, etc.).
- **POST** `/agent/inbox/:sessionId/accept` – Accept session.
- **PUT** `/agent/inbox/:sessionId/resolve` – Resolve (body: category, notes, outcome, wrapUpData).
- **POST** `/agent/inbox/:sessionId/transfer` – Transfer (body: targetAgentId, reason).
- **POST** `/agent/inbox/transfer/bulk` – Bulk transfer.
- **GET** `/agent/inbox/transfer/agents` – Available agents for transfer.
- **GET/POST** `/agent/inbox/presence` – Get/set agent presence.
- **POST** `/agent/inbox/:sessionId/reengage` – Send re-engagement template.
- **GET** `/agent/contacts/:contactId` – Contact profile.
- **PATCH** `/agent/contacts/:contactId` – Update contact.
- **GET** `/agent/contacts/:contactId/notes` – Notes list.
- **POST** `/agent/contacts/:contactId/notes` – Add note.
- **GET** `/agent/contacts/:contactId/history` – Audit history (paginated).
- **GET** `/agent/contacts/:contactId/resolutions` – Resolutions for contact.
- **POST** `/api/dashboard/media/upload` – Upload file (multipart); returns `{ url, filename }`.
- **GET** `/api/dashboard/media/:filename` – Serve file (no auth).

---

## 5. Summary

| Item | Status |
|------|--------|
| **Inventory** | Section 1 lists all inbox-related files, classes, and functions. |
| **Data flow** | Section 2 summarizes how messages and list updates flow. |
| **Layers** | Section 3.2 defines logical layers without moving code. |
| **WebSocket** | Section 3.4 describes additive real-time; same APIs, event-driven refetch. |
| **Next steps** | Section 3.6: document contracts → optional hooks/refactors → real-time → tests. |

The system is **working**; consolidation is about clear boundaries, one place for semantics, and a documented path to WebSockets and future features while staying reliable and maintainable.
