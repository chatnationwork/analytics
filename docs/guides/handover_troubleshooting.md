# Handover troubleshooting: session not assigned

When handover succeeds (session created) but the chat stays **unassigned**, use this checklist and verification queries.

---

## End-to-end flow (what runs when)

1. **Auth**  
   Request uses API Key (query `?apiKey=...` or header `x-api-key`).  
   The key is validated and **`tenantId`** is taken from that key’s record (table `api_keys`).  
   So the handover always runs in **one tenant** – the one that owns the API key.

2. **Session**  
   `getOrCreateSession(tenantId, contactId, name, channel, context)` creates or reuses an inbox session for that tenant and contact.

3. **Assignment (runs before any WhatsApp send)**  
   `requestAssignment(session.id, teamId, context)`:
   - If you sent **`teamId`**: uses that team’s routing strategy and **team members** as agents. Schedule (if enabled) can block assignment (e.g. team closed).
   - If you did **not** send `teamId`:
     - Strategy comes from **tenant-level** assignment config (or defaults to `round_robin`).
     - **Available agents** come from the “waterfall”:
       1. **team** – skipped when no `teamId`.
       2. **member** – users in **tenant** with role **Member** (`tenant_memberships.role = 'member'`).
       3. **admin** – users with role **Admin**.
       4. **super_admin** – users with role **Super Admin**.
     - If **no one** is found from those roles, the code falls back to the **default team** (where `teams.isDefault = true`): agents = that team’s members.
   - If the waterfall + default team still yield **no agents**, the session stays **unassigned** and a warning is logged.

4. **Confirmation message (best-effort, after assignment)**  
   If `sendHandoverMessage !== false`, the “Connecting you to an agent...” (or custom) message is sent in the **background** via WhatsApp.  
   Failures here (e.g. WhatsApp/CRM config) do **not** block or undo assignment; they only affect the optional message.

---

## Why “there is a member” but it’s still unassigned

- **“Member” in Team Management** = row in `team_members`. That is used only when you **send a `teamId`** (or when we fall back to the **default team** when no tenant-roles are found).
- **“Member” for handover with no `teamId`** = row in **`tenant_memberships`** with `role` in `('member','admin','super_admin')` for that **same tenant** as the API key.

So if you’re not routing to any team, the system first looks at **tenant-level roles** (Settings → People), not team membership. If no one has Member/Admin/Super Admin at the tenant level, it then tries the **default team’s** members. If that team has no members either, you get 0 agents and the session stays unassigned.

---

## Verification queries (run against your DB)

Use your tenant ID (e.g. `d3038124-c1a0-410b-a3cb-c162bea99fc7`). Replace `YOUR_TENANT_ID` below.

### 1. API key → tenant (confirm handover runs in the right org)

List active keys for the tenant (handover uses the key’s `tenantId`):

```sql
SELECT id, "keyPrefix", "tenantId", "isActive"
FROM api_keys
WHERE "tenantId" = 'YOUR_TENANT_ID' AND "isActive" = true;
```

Confirm the key you use (e.g. `wk_Q_...`) is in this list and that `tenantId` matches the tenant where you have CRM and members.

The handover request’s **tenantId** is the one from the API key. It must match the tenant where you expect CRM and agents.

### 2. Tenant members that count as agents (no teamId)

For handover **without** `teamId`, assignment uses these roles (in order: member → admin → super_admin).

```sql
SELECT tm."userId", tm.role, u.email
FROM tenant_memberships tm
JOIN users u ON u.id = tm."userId"
WHERE tm."tenantId" = 'YOUR_TENANT_ID'
  AND tm.role IN ('member', 'admin', 'super_admin')
  AND tm."isActive" = true;
```

If this returns **no rows**, handover with no team will find **0 agents** from tenant roles. Then the code falls back to the default team (see below).

### 3. Default team and its members (fallback when no tenant agents)

```sql
SELECT t.id, t.name, t."isDefault"
FROM teams t
WHERE t."tenantId" = 'YOUR_TENANT_ID' AND t."isDefault" = true;
```

If there is a default team, check it has members:

```sql
SELECT tm."userId", tr.role
FROM team_members tm
JOIN teams t ON t.id = tm."teamId"
LEFT JOIN team_roles tr ON tr.id = tm."roleId"
WHERE t."tenantId" = 'YOUR_TENANT_ID' AND t."isDefault" = true;
```

If **tenant roles** returned no one and **default team** has no members (or there is no default team), assignment will stay unassigned.

### 4. CRM integration (WhatsApp confirmation message)

Assignment does **not** depend on CRM. CRM is only used for sending the optional “Connecting you to an agent...” message. So CRM issues do not cause “not assigned”; they can only cause the confirmation message to fail.

For the message to send, the integration must be active and have the right shape:

```sql
SELECT id, name, "isActive", "apiUrl", "apiKeyEncrypted" IS NOT NULL AS has_api_key,
       config->>'phoneNumberId' AS "phoneNumberId"
FROM crm_integrations
WHERE "tenantId" = 'YOUR_TENANT_ID';
```

- `isActive` must be true.
- `apiUrl` must be set (e.g. your CRM base URL); WhatsApp send uses `apiUrl + /api/meta/...`.
- `apiKeyEncrypted` must be set (decrypted at runtime for the request).
- `config->>'phoneNumberId'` should be set (you already have this).

If any of these are missing, the **confirmation message** may fail; **assignment** still runs and can succeed.

### 5. Assignment config (optional; when no teamId)

If you use a tenant-level assignment config (strategy / waterfall):

```sql
SELECT id, "tenantId", "teamId", enabled, strategy, settings
FROM assignment_configs
WHERE "tenantId" = 'YOUR_TENANT_ID' AND ("teamId" IS NULL OR "teamId" = '');
```

If there is no row, the code uses defaults: strategy `round_robin`, waterfall `["team","member","admin","super_admin"]`.

---

## Quick fix when you’re not routing to any team

- **Option A – Tenant roles**  
  In **Settings → People**, ensure at least one user has role **Member**, **Admin**, or **Super Admin** for that tenant.  
  Run query **#2** above to confirm.

- **Option B – Default team**  
  In **Team Management**, mark one team as **default** and add at least one **member** to that team.  
  If tenant roles don’t find anyone, the code uses this team’s members.  
  Run queries **#3** to confirm.

- **Option C – Send a team**  
  In the handover body, send **`teamId`** (UUID of the team that has members).  
  Then assignment uses that team’s members and strategy.

---

## Logs to check after a handover

When assignment finds **no agents**, the API logs something like:

```text
Handover session <id> left unassigned. Strategy=..., availableAgents=0 (tenantId=..., teamId=none). Check: strategy is "manual", team has no members, or tenant has no member/admin/super_admin roles.
```

- **`availableAgents=0`** → fix tenant roles and/or default team (or send `teamId`) as above.
- **`Strategy=manual`** → change team/tenant routing strategy to e.g. round_robin if you want auto-assignment.

When the **confirmation message** fails (e.g. WhatsApp config), you’ll see:

```text
Handover confirmation message failed (assignment already done): ...
```

Assignment has already run; only the optional message failed. Fix CRM/WhatsApp config so the user gets the “Connecting you to an agent...” message.
