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
*Result*: If no Team, Member, or Admin is found, the system will execute the `noAgentAction` instead of assigning to a Super Admin.

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
*Result*: If the team is empty, it immediately replies and doesn't look for general members.
