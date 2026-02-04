# Agent Assignment Logic

This document describes the automated logic used to route incoming sessions (chats) to agents.

## 1. Waterfall Assignment Strategy

The assignment logic follows a "Waterfall" approach, checking tiers of agents in a specific order. It stops as soon as it finds a tier with available users.

### Default Tiers (Order):

1.  **Team Members**: (Only if a `teamId` is specified in the Handover).
2.  **General Members**: Users with the global role `MEMBER`.
3.  **Admins**: Users with the global role `ADMIN`.
4.  **Super Admins**: Users with the global role `SUPER_ADMIN`.

### Logic Flow

1.  Check Tier 1. If agents found -> **Assign** (Random/Round-Robin).
2.  If Tier 1 empty -> Check Tier 2.
3.  If Tier 2 empty -> Check Tier 3.
4.  If Tier 3 empty -> Check Tier 4.
5.  If Tier 4 empty -> **Fallback Action**.

---

## 2. Configuration (`assignment_configs`)

The logic involves an `AssignmentConfigEntity` stored in the database.
The `settings` JSON column allows advanced configuration of the waterfall.

### JSON Schema

```json
{
  "waterfall": {
    "enabled": true,
    "levels": ["team", "member", "admin", "super_admin"],
    "noAgentAction": "queue",
    "noAgentMessage": "All agents are busy. Please leave a message."
  }
}
```

### Configuration Options

#### `levels` (Array of Strings)

Defines the order of validation. You can reorder or remove levels.

- **Values**: `'team'`, `'member'`, `'admin'`, `'super_admin'`.
- **Example**: `["team", "member"]` (Will never assign to admins).

#### `noAgentAction` (String)

What to do if logical falls through all tiers without finding an agent.

- **`queue`** (Default): Leave the session as `UNASSIGNED`. It will appear in the "Unassigned" tab.
- **`reply`**: Send a WhatsApp message to the user immediately.

#### `noAgentMessage` (String)

The message content to send if `noAgentAction` is set to `'reply'`.

---

## 3. Fallback & "Stop Conditions"

By customizing the `levels` array, you can effectively create "Stop Conditions".

**Example: Do NOT assign to Super Admins**
Configuration:

```json
{
  "waterfall": {
    "levels": ["team", "member", "admin"]
  }
}
```

_Result_: If no Team, Member, or Admin is found, the system will execute the `noAgentAction` instead of assigning to a Super Admin.

**Example: Auto-Reply if Team is missing**
Configuration:

```json
{
  "waterfall": {
    "levels": ["team"],
    "noAgentAction": "reply",
    "noAgentMessage": "No agents available in this team."
  }
}
```

_Result_: If the team is empty, it immediately replies and doesn't look for general members.

---

## 4. Maximum load (per team)

Each team can set a **maximum concurrent chats per agent** in **Schedule & Routing** (Team Management → Manage Team → Schedule & Routing).

- **Setting**: `routingConfig.maxLoad` (positive number). Omitted or empty = no limit.
- **Behaviour**: When selecting an agent for assignment, only agents whose current **assigned** (open) chat count is **strictly less** than `maxLoad` are considered. Agents at or above the limit are excluded until they resolve chats.
- **Where**: Team entity `routingConfig.maxLoad`; UI in Manage Team → Schedule & Routing → "Maximum concurrent chats per agent".

---

## 5. Assigning the queue (unassigned chats)

Unassigned sessions stay in the queue until they are assigned. Assignment can happen in two ways:

### Automatic (when an agent goes online)

When an agent goes **online** (presence set to "Online"), the system runs **queue assignment** for the tenant: it takes unassigned sessions (oldest first), and assigns them to available agents using the team’s routing strategy and max load. So agents who just came online can receive queued chats immediately.

### Manual ("Assign queue" button)

- **UI**: Team Management page → **Scheduling & Queue** → **Assign queue**.
- **API**: `POST /agent/inbox/assign-queue?teamId=<optional>`.
- **Behaviour**: Runs the same assignment logic once: unassigned sessions (optionally for one team if `teamId` is set) are assigned to available (online, under max load) agents in FIFO order, respecting routing strategy.
- **Use case**: When no one has just gone online but there are queued chats and available agents (e.g. after a backlog), an admin can trigger assignment on demand.
