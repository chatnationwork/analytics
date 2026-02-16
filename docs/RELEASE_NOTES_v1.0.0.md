# Functional Release Notes - Shuru Connect v1.0.0

**Release Date:** February 13, 2026  
**Environment:** Staging
**Versioning:** Semantic Versioning (MAJOR.MINOR.PATCH)  
**Deployment:** v1.0.0

---

## Core Architecture Summary

Shuru Connect is an omnichannel support platform built around:

- **Omnichannel Inbox** — Unified agent view for WhatsApp and Web Chat with real-time messaging
- **Event-Driven Analytics** — Funnels, user journeys, self-serve vs assisted metrics, CSAT, and AI health monitoring
- **Role-Based Security** — Granular RBAC with tenant isolation, audit logging, and configurable permissions
- **AI-Assisted Automation** — Bot containment tracking and AI health monitoring for classification and processing errors

---

## Release Metadata

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| Release Date | February 2026                           |
| Environment  | Production                              |
| Versioning   | Semantic Versioning (MAJOR.MINOR.PATCH) |
| Changelog    | See [Changelog](#changelog) below       |

---

## Changelog

### v1.0.0 (February 2026)

- Initial production release
- Agent Inbox with WhatsApp and Web Chat
- Team management, assignment engine, load balancing, bulk transfer
- Analytics suite (Overview, Funnels, User Journeys, Self-Serve vs Assisted, AI Analytics, CSAT, Live Events)
- RBAC with roles, permissions, and Danger Zone
- Session management, system messages, navigation labels
- CRM integrations, API keys, audit logs

---

## ⚠️ Known Limitations

- No message export functionality
- No SLA-based routing or SLA dashboards
- No multi-language UI support
- Analytics date ranges default to 7 / 30 / 90 days in the UI
- Contact import strategies are first (skip), last (overwrite), or reject (fail on duplicate)
- No routing keywords or skill-based assignment

---

## 🧱 System Constraints

| Constraint          | Details                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Supported browsers  | Chrome, Firefox, Edge                                                                                       |
| Max attachment size | 10 MB                                                                                                       |
| CSAT delivery       | CSAT surveys are sent on resolved conversations only; link configured per CRM integration                   |
| Assignment engine   | Runs on handover, agent go-online, and Assign Queue actions; respects team schedule and agent online status |

---

## 📥 Operations & Inbox

### Agent Inbox (`/agent-inbox`)

- **Omnichannel Messaging**: Two-way real-time communication across WhatsApp and WebChat.
- **Supported Media Types**:
  - Images (JPG, PNG, GIF, WebP)
  - Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR)
  - Audio
  - Video
  - Location pins
  - Contact cards (VCF)
- **Resolution Management**: Chats follow a lifecycle from "In Progress" to "Resolved," with persistent history for auditing.

### Team Management (`/team-management`)

- **Agent Presence**: Agents manage availability via Online/Offline toggle.
- **Load Balancing**: Supervisors can bulk transfer sessions to another agent or team. Transfers preserve chat history; transfer records (from, to, reason, timestamp) are stored in `session.context.transfers` and logged in audit logs.
- **Organization Structure**: Create, rename, and remove teams to match organizational hierarchy.

### Assignment & Routing

Sessions are automatically routed to teams/agents based on handover rules, or manually assigned by supervisors.

**Routing Strategies** (configurable per team):

- `round_robin` — Distributes chats in a circular order (sort by name, created_at, or random)
- `least_active` — Assigns to the agent with the fewest open chats
- `least_assigned` — Assigns to the agent with the fewest total assignments (within a time window)
- `hybrid` — Combines priorities (e.g. least_active then least_assigned) with round-robin tie-breaking
- `manual` — No auto-assignment; agents pick from the queue

**Capacity**: Per-team `maxLoad` caps concurrent chats per agent; agents at or above the limit are excluded from new assignments.

**Availability**: Only agents with status `ONLINE` receive assignments unless an override is used (e.g. bulk transfer with "Override rules" enabled).

### Contacts (`/contacts`)

- **Import Intelligence**: Deduplication by normalized phone number. Strategies:
  - **First (Skip)**: Keep the first row for each phone; ignore later duplicates.
  - **Last (Overwrite)**: Replace existing contact with the last row for each phone.
  - **Reject**: Fail the entire import if any duplicate is found.
- **Search & Discovery**: Global search by name or phone number.

---

## 📊 Analytics Suite

### Overview (`/overview`)

- **Traffic Attribution**: Distinguishes "Total Visitors" (unique anonymous IDs) from "New Registered Users" (unique identified user IDs).
- **Time-Series Filtering**: All metrics synchronize with a global date range selector.

### Funnel Analytics (`/funnel`)

- **Sequential Conversion (Strict)**: Step N must occur after Step N-1 within the same session.
- **Independent Conversion (Loose)**: Total hits per step regardless of event sequence.
- **Drop-off Visualization**: Conversion rates and percentage lost between steps.

### User Journeys (`/journey`)

**Behavioral session analysis** — Groups user events into discrete sessions based on activity windows. Use for understanding event sequences, session duration, and conversion status per session.

- **Session Analysis**: Event grouping by activity windows.
- **Noise Suppression**: Optional filter to hide standard events (e.g. page views) and focus on significant actions.
- **Session Metadata**: Duration, device data, final conversion status per session.

### Self-Serve vs Assisted (`/journeys`)

**Outcome classification summary** — Categorizes customer interactions by outcome type, not by raw event sequence. Use for high-level metrics on bot vs human resolution.

- **Outcome Classification**: "Completed" (resolved via bot), "Assisted" (handled by an agent), "Abandoned" (dropped off).

### AI & Intents (`/ai-analytics`)

- **Bot Containment**: Percentage of interactions fully resolved by AI without human intervention.
- **AI Health Monitoring**: Aggregates and displays technical errors encountered during AI processing or classification. Categories include: technical errors (API/LLM failures), classification failures, timeouts, and fallback triggers.

### CSAT Analytics (`/csat-analytics`)

- **Satisfaction Trends**: Average CSAT score and response volume over time.
- **Engagement Metrics**: Response rate (surveys sent vs scores received).

### Live Events (`/events`)

- **Data Inspection**: Live stream of system events with sortable columns and formatted JSON viewer.

---

## ⚙️ Administration & Settings

### Roles & Permissions (`/settings/roles`)

- **Role Inheritance**: Modifying a locked "System Role" triggers Copy-on-Write, creating a tenant-specific override.
- **Granular RBAC**: UI and API access restricted by role permissions.

### Session Management (`/settings/session`)

- **Security Guardrails**: Inactivity timeouts and maximum session durations.

### System Messages (`/settings/system-messages`)

- **Dynamic Content**: Customize handover messages, Out of Office (OOO) alerts, automated email templates.
- **Asset Management**: Upload organization-specific images for OOO responses.
- **Template Variables**: `{{workspaceName}}`, `{{inviterName}}`.

### Security (`/settings/security`)

- **WhatsApp 2FA**: Multi-factor authentication via WhatsApp message.
- **Password Governance**: Length, complexity, expiry rotation.
- **Session Integrity**: Optional "Single Login" policy (invalidates old sessions on sign-in elsewhere).
- **Audit Compliance**: Optional mandatory "Transfer Reasons" for agents.

**Security Controls** (summary):

- Passwords hashed using industry-standard methods (bcrypt).
- Encryption in transit (TLS/HTTPS); CRM API keys encrypted at rest.
- Audit logging covers: auth, config changes, session transfers, resolutions, role/team mutations; retention configurable.
- IP restrictions: not implemented in v1.0.

### Danger Zone (`/settings/danger-zone`)

- **Resource Deletion**: Permanent removal of users, roles, and teams with "Type DELETE to confirm."
- **Entity Protection**: Prevents deletion of critical system entities (e.g. Default Team).

### Navigation Labels (`/settings/navigation`)

- **UI Localization**: Admins can rename sidebar links to match internal terminology.

---

## 🔗 Integrations Scope

| Integration    | Scope                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **WhatsApp**   | WhatsApp Cloud API via CRM adapter; webhooks for message delivery.                                                 |
| **Web Chat**   | In-app web chat; events ingested via capture API.                                                                  |
| **CRM**        | External CRM API integration; configurable per tenant (API URL, key, webLink, csatLink). Handover webhook support. |
| **SMS**        | Not supported in v1.0.                                                                                             |
| **Export API** | CSV exports for resolutions, contacts; no bulk message export API.                                                 |

---

## 📋 Data & Retention

| Data Type                  | Notes                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Chat / Message storage** | Stored indefinitely; no automatic purge.                                                                                   |
| **Analytics events**       | Stored in events table; UI date range defaults to 7 / 30 / 90 days. No automated retention policy in v1.0.                 |
| **Audit logs**             | Stored in `audit_logs`; retention policy configurable (not exposed in UI for v1.0).                                        |
| **Soft vs hard delete**    | Danger Zone performs hard delete after archiving entity JSON to `entity_archive`. Users are deactivated, not hard-deleted. |
| **Contact import**         | Upsert by normalized phone; no merge of custom fields.                                                                     |

---

## Upgrade Notes

- This is the initial v1.0 release. No in-place upgrade from a previous version.
