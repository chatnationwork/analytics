# Custom Agent System Architecture

## Overview
The Custom Agent System provides a native solution for managing customer support interactions, replacing third-party CRM integrations. It consists of a backend module, a frontend inbox, and a dedicated database schema.

## Core Components

### 1. Database Schema
The system introduces 8 new entities managed by TypeORM:
- **Agents & Teams**: `AgentProfile`, `Team`, `TeamMember`, `Shift`
- **Conversations**: `InboxSession` (stores state), `Message` (stores content)
- **Configuration**: `AssignmentConfig` (routing rules)
- **Analytics**: `Resolution`
- **Access Control**: `RolePermission` (RBAC mapping)

### 2. Role-Based Access Control (RBAC)
The system implements a granular permission system defined by `RolePermission` entities, allowing dynamic role capabilities.

**Global Roles (Workspace Level):**
- `SUPER_ADMIN`: Full system access (Billing, Settings, Teams).
- `ADMIN`: Manage settings, teams, and users. View Analytics.
- `AUDITOR`: View-only access to analytics and logs.
- `MEMBER`: No global access. Access restricted to assigned Teams.

**Team Roles (Team Level):**
- `MANAGER`: Manage team settings, assign agents, view team stats.
- `AGENT`: Handle sessions (reply, resolve, transfer).

**Permissions System:**
Permissions are granular keys (e.g., `analytics.view`, `team.settings`) mapped to roles in the `role_permissions` table. Global permissions apply to the workspace, while Team permissions are scoped to the specific team context.

### 3. Backend Services (`apps/dashboard-api`)
- **InboxService**: critical path for session management. Handles creation/retrieval of sessions and storing messages.
- **AssignmentService**: Implements routing logic.
    - `round_robin`: Circular assignment to available agents.
    - `load_balanced`: Assigns to agent with fewest active chats.
    - `manual`: No auto-assignment; agents accept chats from queue.
- **Controllers**:
    - `AgentInboxController`: Agent-facing API (list chats, send messages).
    - `TeamController`: Management API (create teams, add members).
    - `IntegrationController`: Bot-facing API (handover).

### 3. Collector Integration (`apps/collector`)
- **MessageStorageService**: Intercepts `message.received` and `message.sent` events from the ingestion pipeline and persists them to the `message` table asynchronously. This ensures zero data loss even if the dashboard API is down.

### 4. Frontend Application (`packages/dashboard-ui`)
- **Agent Inbox**: Real-time chat interface.
- **Team Management**: Admin interface for organizing agents.

## Data Flow

### Message Ingestion
1. Message arrives via webhook (WhatsApp).
2. Collector receives event.
3. `MessageStorageService` saves message to DB.
4. Dashboard UI polls for new messages.

### Bot Handover
1. Bot detects intent to escalate.
2. Bot calls `POST /agent/integration/handover` with `contactId` and `context`.
3. Backend creates/retrieves session.
4. `AssignmentService` assigns session to a team/agent based on rules.
5. Session appears in Agent Inbox.

### Contact Profile Management
The system provides a Contact Profile Panel in the Agent Inbox that allows agents to:
1. **View/Edit Contact Details**: Name, PIN, Email, and custom metadata fields.
2. **Add Notes**: Agents can add notes about contacts. Each note is timestamped and linked to the author.
3. **Track Changes**: All profile changes are logged in the audit system, showing who made what change and when.

**Database Entities:**
- `ContactEntity`: Stores contact information (tenantId, contactId, name, pin, email, metadata, firstSeen, lastSeen, messageCount)
- `ContactNoteEntity`: Stores agent notes (tenantId, contactId, authorId, content, createdAt)

**API Endpoints:**
- `GET /agent/contacts/:contactId`: Get contact profile
- `PATCH /agent/contacts/:contactId`: Update contact profile (changes are audited)
- `GET /agent/contacts/:contactId/notes`: List notes for a contact
- `POST /agent/contacts/:contactId/notes`: Add a note
- `GET /agent/contacts/:contactId/history`: Get change history from audit log

## Future Improvements
- WebSocket integration for real-time updates (removing polling).
- AI-based suggested replies.
- CSAT collection integration.
