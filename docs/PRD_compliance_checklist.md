# PRD Compliance Checklist

Single source of truth: **Done** vs **Not done** for the omnichannel live chat and workforce management PRD.

---

## 1. Product Vision & Design Principles

| Item                                                    | Status      | Notes                                                                                            |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Prevent race conditions and duplicate actions           | **Done**    | Event deduplication via `messageId`; lease-based locking for chat assignment (SELECT FOR UPDATE) |
| Enforce strict access control                           | **Done**    | RBAC (roles, permissions), server-side checks in controllers                                     |
| Scale to national-level volumes                         | **Partial** | Horizontal scaling possible; not explicitly validated                                            |
| Remain audit-ready at all times                         | **Done**    | Audit log entity, service, API, UI; login, config, chat lifecycle events                         |
| Inbox = Execution only                                  | **Done**    | Inbox UI: accept, transfer, wrap-up, resolve; no routing/config in inbox                         |
| Teams = Routing, Queue, Workforce, Scheduling, Wrap-ups | **Partial** | See Teams section below                                                                          |
| Analytics = Read-only                                   | **Done**    | Analytics endpoints and UI are read-only                                                         |
| Settings = Governance, Security, Audit                  | **Done**    | Settings pages, session config, audit logs, roles                                                |

---

## 2. INBOX (LIVE CHAT)

| ID    | Requirement                                                                                | Status       | Notes                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| FR-I1 | Chat lifecycle views: Assigned, Active, Resolved, Expired; counts accurate and real-time   | **Done**     | Inbox filters (all/pending/resolved/expired); labels Assigned/Active; polling for list                                  |
| FR-I2 | Accept chat                                                                                | **Done**     | Accept button, `assignSession` in InboxService                                                                          |
| FR-I2 | Transfer chat                                                                              | **Done**     | Transfer dialog, API, inbox service                                                                                     |
| FR-I2 | Add wrap-up                                                                                | **Done**     | Resolve dialog with team wrap-up form; wrapUpData stored                                                                |
| FR-I2 | Resolve chat                                                                               | **Done**     | Resolve API; mandatory wrap-up enforced when team config requires it                                                    |
| FR-I3 | Real-time messaging                                                                        | **Done**     | Send/receive messages; inbox list and messages fetched via API                                                          |
| FR-I3 | Typing indicators                                                                          | **Not done** | No typing indicator in UI or API                                                                                        |
| FR-I3 | Attachments: image, document, audio, video, location (templates out of scope)              | **Done**     | Full send path via CRM endpoint (image, video, audio, document, location); MessageType.LOCATION; API + backend          |
| FR-I4 | Customer profile (read-only): contact details, channel, history, session timer, AI summary | **Partial**  | Contact info in session; contacts page exists; session timer and AI-generated chat summary not clearly present in inbox |

---

## 3. CONTACTS

| Requirement                          | Status       | Notes                                                                                          |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------- |
| Auto-create on first inbound message | **Done**     | Contact upsert on message.received (collector/processor); ContactEntity, contacts table        |
| Manual creation                      | **Not done** | No UI/API for creating a contact manually                                                      |
| Import/export (CSV)                  | **Not done** | No import/export flows                                                                         |
| Custom fields                        | **Not done** | Contact entity has fixed fields (tenantId, contactId, name, firstSeen, lastSeen, messageCount) |
| Persistent conversation history      | **Done**     | Messages stored per session; history available via session/messages                            |

---

## 4. TEAMS (WORKFORCE & OPERATIONS)

### 4.1 Team Management

| Requirement                         | Status       | Notes                                                                   |
| ----------------------------------- | ------------ | ----------------------------------------------------------------------- |
| Create, edit, deactivate teams      | **Done**     | Team CRUD; TeamEntity.isActive; team-management UI                      |
| Assign teams to channels / services | **Partial**  | Handover accepts teamId; no explicit “assign team to channel” config UI |
| Define routing keywords             | **Not done** | No routing keywords in team or assignment config                        |

### 4.2 Team Members & Status

| Requirement                                            | Status       | Notes                                                                                                                       |
| ------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Status: Online, Busy, Unavailable, Off Shift, On Leave | **Partial**  | Presence: go online/offline only (PresenceService, agent_sessions). No Busy/Unavailable/Off Shift/On Leave in UI or backend |
| On Leave: requested by user, approved by Team Manager  | **Not done** | No leave request/approval flow                                                                                              |

### 4.3 Team Scheduling

| Requirement                                           | Status      | Notes                                                                                                             |
| ----------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Working days, one or more time blocks per day         | **Done**    | TeamEntity.schedule (timezone, days, start/end blocks); ManageTeamDialog schedule UI                              |
| Outside hours: members Off Shift, chats to Team Queue | **Partial** | Schedule stored and can be checked; assignment service has schedule check comment; queue behavior not fully wired |

### 4.4 Team Queue

| Requirement                         | Status       | Notes                                                                                              |
| ----------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| One queue per team; size and aging  | **Partial**  | Unassigned sessions per team (getUnassignedSessions); no dedicated queue entity/size/aging metrics |
| Managers can drop into queued chats | **Not done** | No “manager takes from queue” action                                                               |

### 4.5 Assignment Engine

| Requirement                                                   | Status      | Notes                                                                                                                      |
| ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Run only during team working hours                            | **Partial** | Schedule present; assignment logic has schedule comment but may not block OOO                                              |
| Respect user status and capacity                              | **Partial** | Assignment uses waterfall (team/member/admin/super_admin); “Ignores Online status and Capacity for now” in code            |
| Strategies: Round Robin, Least Active, Least Assigned, Hybrid | **Partial** | AssignmentConfigEntity.strategy; round_robin, load_balanced, manual in code; least_active/least_assigned/hybrid referenced |
| Concurrency: lease-based locking; only one user can accept    | **Done**    | assignSession uses transaction + pessimistic_write lock; ConflictException when already assigned                           |

### 4.6 Wrap-Up Configuration

| Requirement                                                                                | Status      | Notes                                                                        |
| ------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------- |
| FR-WU-1: Team-defined wrap-up templates (categories, outcomes, tags, optional sub-reasons) | **Done**    | TeamEntity.wrapUpReport (enabled, mandatory, fields with type/label/options) |
| FR-WU-2: Mandatory enforcement                                                             | **Done**    | InboxService blocks resolve when mandatory wrap-up missing                   |
| FR-WU-3: Agents select wrap-ups, optional free text; cannot create/edit templates          | **Done**    | Resolve dialog uses team config; agents fill form only                       |
| FR-WU-4: Managers/QA filter and analyze; exportable                                        | **Partial** | Resolution stored; analytics/QA views and export not fully confirmed         |

### 4.7 Themes & Banners

| Requirement                                         | Status       | Notes                                    |
| --------------------------------------------------- | ------------ | ---------------------------------------- |
| Themes under Teams; webviews, banners, special days | **Not done** | No theme/banner entity or UI under teams |

### 4.8 Alerts & Escalation

| Requirement                                        | Status       | Notes                           |
| -------------------------------------------------- | ------------ | ------------------------------- |
| Thresholds: queue size, aging, capacity breaches   | **Not done** | No threshold config or alerting |
| Alerts to Team Managers / QA via email or WhatsApp | **Not done** | No alert pipeline               |

---

## 5. ROLES & USER MANAGEMENT (IAM)

| Requirement                                     | Status   | Notes                                                         |
| ----------------------------------------------- | -------- | ------------------------------------------------------------- |
| Create/edit/deactivate users                    | **Done** | Tenants/invitations; people settings; invite/accept/revoke    |
| Create/edit roles                               | **Done** | Roles & Permissions UI; RoleEntity; role controller           |
| Assign permissions to roles                     | **Done** | RBAC; RoleEntity.permissions; seed and sync in RbacService    |
| Assign roles to users                           | **Done** | Tenant membership with role; team member role (Manager/Agent) |
| Enforce permissions server-side on every action | **Done** | Guards and can() checks in controllers; RbacService           |

---

## 6. ANALYTICS & QA

| Requirement                                                              | Status      | Notes                                                                                                                              |
| ------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Agent & team performance                                                 | **Done**    | Agent analytics page, leaderboard, stats                                                                                           |
| Resolution times                                                         | **Done**    | Resolution entity and analytics                                                                                                    |
| CSAT                                                                     | **Partial** | CSAT CTA message sent on resolve (WhatsApp); configurable CSAT link in CRM integration; no CSAT result collection/analytics in app |
| Volume trends, drop-off, intent, traffic by geography                    | **Done**    | WhatsApp analytics, overview, funnel, journey, trends                                                                              |
| QA: wrap-up review, conversation drill-down, AI summaries, quality flags | **Partial** | Resolution/wrap-up data stored; drill-down and AI summaries not clearly implemented                                                |

---

## 7. SETTINGS (GOVERNANCE)

### Security

| Requirement                                                               | Status       | Notes                                                                                          |
| ------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| JWT authentication                                                        | **Done**     | Auth service, JWT strategy, login                                                              |
| OTP / 2FA                                                                 | **Not done** | No 2FA/OTP in auth                                                                             |
| Single active session                                                     | **Partial**  | Session revocation (sessionsRevokedAt) invalidates all tokens; no “one session per user” limit |
| Configurable session timeout                                              | **Done**     | Session settings (max duration, inactivity timeout); JWT expiry; SessionManager idle logout    |
| Password policy: auto-generated, first-login change, strong rules, expiry | **Partial**  | Invitation claim with password; no explicit first-login change or password policy config       |

### Audit Logs

| Requirement                                | Status       | Notes                                                                                    |
| ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| Log: login, chat lifecycle, config changes | **Done**     | AuditLogEntity; audit service; login, team config, session assigned/resolved/transferred |
| Exclude message content                    | **Done**     | Details are structural (e.g. resourceId), not message body                               |
| Configurable retention                     | **Not done** | No retention policy or cleanup job                                                       |

---

## 8. Reliability & Correctness

| Guarantee                          | Status      | Notes                                                                                        |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Lease-based locking for assignment | **Done**    | Transaction with SELECT FOR UPDATE in assignSession; ConflictException when already assigned |
| Idempotent webhook processing      | **Partial** | Processor deduplicates by messageId; WhatsApp webhook idempotency not confirmed              |
| Event deduplication via event IDs  | **Done**    | messageIdExists in processor; unique messageId                                               |
| Deterministic state transitions    | **Partial** | Session status flows implemented; no formal state machine doc                                |
| No permanent locks                 | **N/A**     | No locking implemented                                                                       |

---

## 9. Scalability & Performance

| Item                         | Status      | Notes                                   |
| ---------------------------- | ----------- | --------------------------------------- |
| Horizontal scalability       | **Partial** | Stateless API; no explicit scaling docs |
| High availability            | **Partial** | Not explicitly designed for HA          |
| Graceful degradation         | **Partial** | Not specified                           |
| Near real-time inbox updates | **Partial** | Polling; no WebSocket for inbox         |

---

## 10. Compliance & Auditability

| Item                       | Status      | Notes                                                              |
| -------------------------- | ----------- | ------------------------------------------------------------------ |
| Immutable audit logs       | **Partial** | Append-only usage; no immutability guarantee (e.g. DB-level)       |
| Read-only QA access        | **Done**    | Auditor role; analytics read-only                                  |
| Privacy-preserving logging | **Done**    | No message content in audit details                                |
| GovTech audit readiness    | **Partial** | Audit trail exists; retention and formal compliance not documented |

---

## 11. Success Metrics (Implementation Support)

| Metric                       | Status      | Notes                                                           |
| ---------------------------- | ----------- | --------------------------------------------------------------- |
| Zero double chat assignments | **Done**    | Lease-based locking in assignSession; 409 when already assigned |
| Zero duplicate conversations | **Partial** | getOrCreateSession prevents multiple active; dedup on events    |
| Accurate lifecycle counts    | **Done**    | Inbox filters and counts                                        |
| No manual reconciliation     | **Partial** | Dedup and state help; assignment now protected by lease lock    |
| Positive CSAT trend          | **Partial** | CSAT link sent; no in-app CSAT collection/reporting             |

---

## Summary

- **Done:** Inbox lifecycle (views, accept, transfer, wrap-up, resolve), real-time messaging, lease-based assignment locking (zero double assignments), contacts auto-create and history, team CRUD and scheduling, wrap-up config and enforcement, RBAC and user/role management, analytics and audit logs, JWT and session timeout, event deduplication, session revocation.
- **Partial:** Customer profile (timer, AI summary), team queue and assignment (schedule/status/strategies), CSAT and QA features, password policy, idempotent webhooks, scalability/HA.
- **Not done:** Typing indicators, contacts manual create/import/export/custom fields, routing keywords, full agent status (Busy/Unavailable/Off Shift/On Leave), leave approval, manager drop-in queue, themes/banners, alerts/escalation, 2FA, audit retention.

Use this checklist for prioritisation and to align engineering work with the PRD.
