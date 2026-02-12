# Danger Zone: Delete Users, Roles, Teams (System Admin Only)

## Overview

Add a centralized "Danger Zone" in Settings where **system admins only** can permanently delete users, roles, and teams. Before deletion, the entity is archived as JSON in a dedicated table.

**Principles:**
- Keep it simple: archive as JSON → delete entity
- Single location for destructive actions (no delete buttons scattered in UI)
- Strong warnings before any delete
- System admin only (not super_admin, not other roles)

---

## 1. Scope

| Entity | Current behavior | New behavior |
|--------|------------------|--------------|
| **User** | Only deactivate (stays in list). No hard delete. | Optional: archive + hard delete. Clarify: delete from tenant, or delete user globally? **Proposal**: For now, "delete user" = remove from tenant and archive the membership + user snapshot. Full user deletion (from `users` table) is complex (affects all tenants). **Simpler**: Archive tenant membership + user snapshot, then deactivate (or we add a "delete user from platform" that archives and removes from `users`). |
| **Role** | DELETE exists; restricted to custom roles; uses SETTINGS_MANAGE. | Archive role JSON → delete. Restrict to system_admin. |
| **Team** | DELETE exists; restricted to non-default; uses TEAMS_MANAGE. | Archive team + members JSON → delete. Restrict to system_admin. |

**Simplification for MVP:**  
- **User**: "Delete user" = archive tenant membership + user summary, then deactivate. No hard delete from `users` table (avoids cross-tenant complexity).  
- **Role**: Archive custom role JSON → delete.  
- **Team**: Archive team + members JSON → delete.

---

## 2. Permissions

| Permission | Who gets it | Purpose |
|------------|-------------|----------|
| `admin.danger_zone` | `system_admin`, `super_admin` | Access to the Danger Zone page (see the page) |
| `users.delete` | `system_admin`, `super_admin` | Perform delete user action |
| `teams.delete` | `system_admin`, `super_admin` | Perform delete team action |
| `roles.delete` | `system_admin`, `super_admin` | Perform delete role action |

- **Page access:** `admin.danger_zone` — if missing, don't show the Danger Zone link or page.
- **Action access:** Each delete button/flow requires its specific permission. If user has `admin.danger_zone` but not `users.delete`, they see the page but the Delete User section is hidden or disabled.

- Add all four to `Permission` enum in `role.entity.ts`
- Add to `system_admin` and `super_admin` in `RbacService` defaults
- Migration: add to `roles` where `name IN ('system_admin', 'super_admin')`

---

## 3. Archive Table

**Table:** `entity_archive`

| Column | Type | Description |
|--------|------|--------------|
| `id` | UUID | PK |
| `entityType` | varchar | `'user'`, `'role'`, `'team'` |
| `entityId` | UUID | Original entity ID |
| `tenantId` | UUID | Tenant (nullable for system roles) |
| `archivedAt` | timestamptz | When archived |
| `archivedBy` | UUID | User who performed the delete |
| `data` | jsonb | Full entity snapshot |

**Index:** `(entityType, entityId)` for lookup; `(tenantId, archivedAt)` for tenant-scoped queries.

**Data shape:**
- **User**: `{ user: { id, email, name, ... }, membership: { role, joinedAt, ... } }` (tenant membership + user summary)
- **Role**: `{ id, name, description, permissions, tenantId, isSystem, ... }`
- **Team**: `{ team: { id, name, ... }, members: [ { userId, role, ... } ] }` (team + members)

---

## 4. Backend

### 4.1 New module: `DangerZoneModule`

**Controller:** `DangerZoneController`  
**Base path:** `/api/dashboard/settings/danger-zone` (or `/api/dashboard/admin/danger-zone`)

**Guards:**
- `JwtAuthGuard` + permission check:
  - Page/controller base: `admin.danger_zone`
  - Each endpoint: `users.delete`, `teams.delete`, or `roles.delete` respectively

**Endpoints:**

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/archive-and-delete/role/:id` | `roles.delete` | Archive role → delete |
| `POST` | `/archive-and-delete/team/:id` | `teams.delete` | Archive team + members → delete |
| `POST` | `/archive-and-delete/user/:id` | `users.delete` | Archive membership + user snapshot → deactivate (or hard delete if desired) |

**Request:** Optional `{ confirm: "DELETE" }` for extra safety.

**Flow (each endpoint):**
1. Verify caller has the endpoint's permission (`users.delete`, `roles.delete`, or `teams.delete`).
2. Load entity (with relations for team).
3. Build JSON snapshot.
4. Insert into `entity_archive`.
5. Delete entity (or deactivate for user).
6. Audit log.

### 4.2 Restrict existing delete endpoints

- **Role** `DELETE /settings/roles/:id`: Add check for `roles.delete`. Or deprecate and route through Danger Zone only.
- **Team** `DELETE /agent/teams/:teamId`: Add check for `teams.delete`. Or remove and only allow delete via Danger Zone.

**Recommendation:** Keep existing endpoints but add the permission check + archive step. Danger Zone UI calls these same endpoints (or new ones that wrap archive + delete).

---

## 5. Frontend

### 5.1 New page: Settings → Danger Zone

**Path:** `/settings/danger-zone`

**Visibility:** Only if user has `admin.danger_zone`. Hide from nav for others. Each section (Delete User, Delete Role, Delete Team) is shown only if the user has the corresponding permission (`users.delete`, `roles.delete`, `teams.delete`).

**Layout:**
- Red-bordered "Danger Zone" card (matches `SessionSettings` pattern).
- Three sections: Delete User, Delete Role, Delete Team. Each section visible only if user has the corresponding permission.
- Each section:
  - Dropdown/select to pick entity.
  - Warning text: "This action cannot be undone. The data will be archived before deletion."
  - Confirm input: user must type `DELETE` (or entity name).
  - "Delete" button (disabled until confirmed).

**UI flow:**
1. User selects e.g. "Team: Support Team".
2. Warning: "You are about to permanently delete the team 'Support Team'. All members will be removed. This cannot be undone. The team data will be archived."
3. User types `DELETE` in a text field.
4. User clicks "Delete". API: archive + delete.

### 5.2 Navigation

Add "Danger Zone" under Settings sidebar, below Security. Only render if `can('admin.danger_zone')`.

---

## 6. Implementation Order

1. **Permissions + migration**
   - Add `admin.danger_zone`, `users.delete`, `teams.delete`, `roles.delete` to Permission enum, RbacService, migration.
2. **Archive table + entity**
   - Migration for `entity_archive`, Entity class.
3. **DangerZoneService**
   - `archiveAndDeleteRole(id)`, `archiveAndDeleteTeam(id)`, `archiveAndDeleteUser(id)`.
4. **DangerZoneController**
   - POST endpoints, system_admin guard.
5. **Frontend**
   - `/settings/danger-zone` page, API client, nav item.

---

## 7. Open Questions

1. **User delete semantics:** Deactivate only vs hard delete from `users`? Proposal: deactivate + archive membership. Hard delete can be Phase 2 if needed.
2. **System roles:** Cannot be deleted (already blocked). Danger Zone only lists custom roles.
3. **Default team:** Cannot be deleted (already blocked). Danger Zone only lists non-default teams.
4. **Restore:** No restore in MVP. Archive is for audit/recovery (manual DB if needed).
