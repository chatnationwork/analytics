# API Response Shape & Double-Wrap Review

This document reviews how API responses are wrapped (backend interceptor + frontend `fetchWithAuth` / `fetchWithAuthFull`) and lists **all affected areas** across the app so we can fix or standardize any double-wrap issues.

> **Status:** Implementation Complete. The contacts API bug is fixed, and the contact profile frontend is simplified. The API response contract is defined below.

---

## 1. How the wrap works

### 1.1 Backend: ResponseInterceptor

**File:** `libs/common/src/interceptors/response.interceptor.ts`

- **Every** successful controller return value is wrapped as:
  ```ts
  { status: "success", data: <controller_return_value>, timestamp }
  ```
- So if a controller `return contact`, the HTTP body is `{ status, data: contact, timestamp }`.
- If a controller `return { data: contact }`, the HTTP body is `{ status, data: { data: contact }, timestamp }` → **double wrap**: the client sees `data: { data: contact }` and must unwrap again to get `contact`.

### 1.2 Frontend: fetchWithAuth vs fetchWithAuthFull

**File:** `packages/dashboard-ui/lib/api.ts`

| Helper | Returns | Use when |
|--------|--------|----------|
| `fetchWithAuth(url)` | `json.data` (the value inside the interceptor’s `data`) | Single payload (entity, array, or one object). |
| `fetchWithAuthFull(url)` | Full body `{ status, data, timestamp }` | Need `data` and/or other fields (e.g. pagination `total`). |

- So with **one** wrap (controller returns `contact`), `fetchWithAuth` → `contact` ✓.
- With **double** wrap (controller returns `{ data: contact }`), `fetchWithAuth` → `{ data: contact }`; the client gets an object with a `data` property instead of the entity.

**Rule:** Controllers should return the **payload directly** (entity, array, or one object like `{ data, total }`). They should **not** return `{ data: X }` when `X` is the single thing the client should see at the top level.

---

## 2. Backend: Controllers and return shapes

### 2.1 Contact profile (agent/contacts) – ✅ Fixed

**File:** `apps/dashboard-api/src/agent-system/contact-profile.controller.ts`

- `getContact` → returns `contact` (service DTO) directly.
- `updateContact` → returns updated contact directly.
- `getNotes` → returns array directly.
- `addNote` → returns note object directly.
- `getHistory` → returns `{ data: entries, total }` (one object; interceptor wraps once → client gets `{ data, total }`).
- `getResolutions` → returns `{ data, total }` (same).

No double-wrap: one interceptor wrap only.

### 2.2 Agent inbox

**File:** `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts`

- `getSession` → returns `{ session, messages }` (single object). ✓
- Other endpoints return entities or `{ assigned }`, `{ success, messageId }`, etc. No `{ data: entity }` pattern. ✓

### 2.3 Services that return `{ data, total }` (pagination)

These are **intentional** single objects (payload = one object with `data` + `total`). Interceptor wraps once → client gets that one object via `fetchWithAuth` or `res.data` with `fetchWithAuthFull`.

| Backend | Returns | Used by |
|---------|--------|--------|
| `contact-profile.service` | `getContactHistory` → `{ data: entries, total }` | Contact profile history |
| `contact-profile.service` | `getContactResolutions` → `{ data, total }` | Contact profile resolutions |
| `audit.repository` `list()` | `{ data, total, page, limit }` | Audit logs |
| `whatsapp.service` `getContacts` | `{ data, total, page, limit }` | WhatsApp/contacts list |

No double-wrap: the controller returns one object; the client expects that shape.

### 2.4 Agent status

**File:** `apps/dashboard-api/src/agent-system/agent-status.controller.ts`

- `getAgentStatusList` → returns array from service. ✓
- `getSessionHistoryWithMetrics` → returns whatever the service returns (likely `{ data, total, page, limit }`). Frontend uses `fetchWithAuthFull` and `res.data` (see below). ✓

### 2.5 Auth

Auth controllers return objects like `{ accessToken, user }` or `{ ok: true }` directly. Interceptor wraps once. Auth client uses `data.data` (i.e. `json.data` from the wrapped response), which is correct for a single wrap. ✓

### 2.6 All other controllers

- Funnel, events, tenants, invitations, api-keys, sessions, overview, trends, journeys, csat-analytics, agent-inbox-analytics, ai-analytics, crm-integrations, media, team, role, etc. return either raw values or single objects (e.g. `{ success: true }`). None were found that return `{ data: <single_entity> }` in a way that would double-wrap. ✓

---

## 3. Frontend: All areas that depend on response shape

### 3.1 Contact profile (agent inbox)

**File:** `packages/dashboard-ui/components/agent-inbox/ContactProfilePanel.tsx`

- **fetchProfile:** Uses `agentApi.getContactProfile()` (fetchWithAuth). Defensive unwrap:
  - `data && typeof data === "object" && "contactId" in data` → use `data` as contact.
  - Else `(data as { data?: ContactProfile })?.data ?? null`.
- **fetchNotes:** Uses `agentApi.getContactNotes()`. Defensive unwrap: if not array, uses `(data as { data: ContactNote[] }).data` else `[]`.
- **handleAddNote:** Uses `agentApi.addContactNote()`. Defensive unwrap: if `"id" in raw` use raw as note, else `(raw as { data?: ContactNote })?.data ?? raw`.
- **getContactHistory / getContactResolutions:** See agent API below.

Backend now returns raw, so the first branch in each unwrap should always run. The defensive branches are harmless but can be simplified later (remove double-wrap handling) for clarity.

### 3.2 Agent API client

**File:** `packages/dashboard-ui/lib/api/agent/index.ts`

| Method | Uses | Unwrap / notes |
|--------|------|----------------|
| `getInbox`, `getInboxCounts`, `getPresence`, etc. | `fetchWithAuth` | Expects single payload. ✓ |
| `getSession` | `fetchWithAuthFull` | `payload = res?.data ?? {}`; returns `{ session: payload.session, messages: payload.messages }`. Backend returns `{ session, messages }` → one wrap → `res.data` = that object. ✓ |
| `assignQueue` | `fetchWithAuthFull` | Unwraps `(res as { data?: { assigned } })?.data ?? (res as { assigned })` to handle both shapes. ✓ |
| `getContactProfile`, `getContactNotes`, `addContactNote` | `fetchWithAuth` | Backend returns raw → client gets entity/array. ✓ |
| `getContactHistory` | `fetchWithAuthFull` | Backend returns `{ data: entries, total }` → interceptor → `res.data` = `{ data, total }`. Code uses `payload = res?.data`, then `payload?.data` and `payload?.total`. ✓ |
| `getContactResolutions` | `fetchWithAuthFull` | Same pattern as history. ✓ |
| `uploadMedia` | fetch then `json` | `return (json.data ?? json)` to tolerate wrap. ✓ |

All consistent with current backend (no double-wrap).

### 3.3 Agent status API

**File:** `packages/dashboard-ui/lib/agent-status-api.ts`

- `getAgentStatusList`: `fetchWithAuthFull` → returns `(res as Wrapped<AgentStatusItem[]>).data ?? (res as AgentStatusItem[])`. Backend returns array → one wrap → `res.data` = array. ✓
- `getSessionHistoryWithMetrics`: expects `res.data` to be `{ data, total, page, limit }`; returns that and uses `.data` for the list. ✓

### 3.4 Audit API

**File:** `packages/dashboard-ui/lib/audit-api.ts`

- `getAuditLogs`: `fetchWithAuthFull` → `return res.data`. Backend returns `{ data, total, page, limit }` → one wrap → `res.data` = that object. ✓

**File:** `packages/dashboard-ui/app/(dashboard)/audit-logs/page.tsx`

- Uses `data.data` for the array and `data.total` for the total. So it expects `data` = `{ data, total, ... }`, which is what the API returns. ✓

### 3.5 Contacts API (WhatsApp contacts)

**File:** `packages/dashboard-ui/lib/contacts-api.ts`

- `getContacts`: uses `fetchWithAuthFull`, then checks `Array.isArray(res.data)`.
- Backend `whatsapp.service.getContacts` returns `{ data, total, page, limit }` → after interceptor `res.data` = `{ data, total, page, limit }`, so `res.data` is **not** an array.
- So the check `!Array.isArray(res.data)` is **true** and the code throws `"Invalid contacts response"`. This is a **bug** unless the backend for this route is different (e.g. returns array only). The frontend should use `res.data.data` for the array and `res.data.total` etc., or the backend should return the array directly for this endpoint. **Needs fix.**

### 3.6 Auth and login

**File:** `packages/dashboard-ui/lib/auth-client.ts`

- `login`, `signup`, `getProfile`: use `data.data` (response is `{ status, data, timestamp }`, so `data` = that, `data.data` = payload). Backend returns payload; one wrap. ✓

**File:** `packages/dashboard-ui/app/(auth)/login/actions.ts` and signup/invite

- Use `const responseData = data.data ?? data` so they work with or without the interceptor wrap. ✓

### 3.7 API (lib/api.ts) – tenant, overview, etc.

- `getCurrentTenant`, overview, funnel, events, sessions, etc.: use `fetchWithAuth` and expect the unwrapped payload. Backend returns single payload. ✓
- Some use `res.data ?? res` for robustness (e.g. tenant, 2FA). ✓

### 3.8 Other API modules

- **settings-api, whatsapp-analytics-api, ai-trends-api, csat-analytics-api, agent-inbox-analytics-api, journeys-api, overview-enhanced-api, trends-api, ai-analytics-api:** Use `fetchWithAuth` and expect the payload. Backend controllers return service result directly. ✓
- **team-management (invitations):** `fetchWithAuth` for list/create/revoke. ✓
- **SessionSettings / tenants/current:** `fetchWithAuth`. ✓

### 3.9 Dashboard pages that use `.data` on the response

Many pages use `something?.data ?? []` or `trend?.data` when the **backend** returns an object with a `data` property (e.g. `{ data: trendArray }`). That is a **single** payload shape, not double-wrap. After interceptor we get `{ status, data: { data: trendArray }, timestamp }`, and `fetchWithAuth` returns `{ data: trendArray }`, so the page correctly uses `.data` for the array. ✓

---

## 4. Summary: What’s consistent vs what to fix

### 4.1 Fixed / consistent

- **Contact profile (backend):** Returns raw (contact, array, note, or `{ data, total }`). No double-wrap.
- **Contact profile (frontend):** Defensive unwraps; works with current backend; can be simplified later.
- **Agent inbox (getSession, sendMessage, etc.):** Backend returns single objects; frontend uses `res.data` or fetchWithAuth as appropriate.
- **Audit logs:** Backend returns `{ data, total, page, limit }`; frontend uses `res.data` then `data.data` / `data.total`. ✓
- **Agent status:** Backend returns array or paginated object; frontend unwraps `res.data`. ✓
- **Auth:** Single wrap; client uses `data.data`. ✓
- **All other controllers:** Return single payloads; no `{ data: entity }` double-wrap found.

### 4.2 Bug: Contacts API (WhatsApp contacts)

- **Backend:** `GET /whatsapp/contacts` returns `{ data, total, page, limit }` (whatsapp.service.getContacts).
- **Frontend:** `lib/contacts-api.ts` uses `fetchWithAuthFull` and expects `res.data` to be the **array** (`Array.isArray(res.data)`). It is not; `res.data` is `{ data, total, page, limit }`.
- **Fix (choose one):**
  - **Option A:** In `contacts-api.ts`, treat `res.data` as the paginated object: use `res.data.data` for the array, `res.data.total`, `res.data.page`, `res.data.limit`, and return that shape. **(Implemented)**
  - **Option B:** Change backend `getContacts` to return the array only (and e.g. put total/page/limit in headers or a different endpoint). Then adjust frontend accordingly.

### 4.3 Optional cleanup

- **ContactProfilePanel:** Remove the defensive `(data as { data?: X })?.data` branches for profile/notes/addNote. **(Implemented)**
- **agentApi.getContactHistory / getContactResolutions:** Switched to `fetchWithAuth`; return type is `{ data, total }` directly. No manual unwrap of the wrapped body.

**Intentional defensive unwraps (left as-is):** In `app/(auth)/login/actions.ts` and `lib/api.ts` (tenant, 2FA), `data.data ?? data` and `res.data ?? res` are kept for resilience if the backend ever sends an unwrapped body. These are not double-wrap fixes; they are fallbacks. No change planned.

---

## 5. Checklist for new endpoints

To avoid double-wrap:

1. **Controller:** Return the payload directly (entity, array, or one object e.g. `{ data, total }`). Do **not** return `{ data: entity }` when the client should receive the entity as the top-level `data` after the interceptor.
2. **Frontend:** Use `fetchWithAuth` when you want the single payload (you get `json.data` = that payload). Use `fetchWithAuthFull` when you need the full body and then use `res.data` (which is the controller return value).
3. **Pagination:** Backend can return `{ data: array, total, page?, limit? }` as the **single** return value; interceptor wraps it once; frontend gets that object via `res.data` or `fetchWithAuth`.

## 7. API Response Contract

To prevent regression, all new code must follow this contract:

1.  **Backend (Controllers):**
    *   Return the **payload directly** (entity, array, or object).
    *   **NEVER** return `{ data: entity }` if `entity` is the only thing the client needs.
    *   For pagination, return `{ data: [], total: number, ... }`. This is a single object payload.

2.  **Interceptor:**
    *   Wraps all successful responses in `{ status: "success", data: payload, timestamp }`.

3.  **Frontend:**
    *   **`fetchWithAuth<T>(url)`**: Returns `T` (the payload). Use this for most requests.
    *   **`fetchWithAuthFull<Wrapper>(url)`**: Returns `{ status, data: T, ... }`. Use this when you need pagination metadata from the payload (e.g. `res.data.total`).
    *   **NO defensive double-unwrap:** Do not use `props.data ?? props` or `(res as {data: T}).data`. Assume the single-wrap contract holds.

---

## 6. Files touched (quick reference)

| Area | Backend | Frontend |
|------|---------|----------|
| Contact profile | `agent-system/contact-profile.controller.ts` (returns raw) | `ContactProfilePanel.tsx`, `lib/api/agent/index.ts` (getContactProfile, getContactNotes, addContactNote, getContactHistory, getContactResolutions) |
| Agent inbox | `agent-inbox.controller.ts` (returns `{ session, messages }` etc.) | `lib/api/agent/index.ts` (getSession, assignQueue, etc.) |
| Agent status | `agent-status.controller.ts` | `lib/agent-status-api.ts`, `team-management/agent-status/page.tsx` |
| Audit logs | `audit/audit.controller.ts`, `audit.service.ts`, audit-log.repository | `lib/audit-api.ts`, `audit-logs/page.tsx` |
| WhatsApp contacts | `whatsapp/whatsapp.controller.ts`, whatsapp.service (returns `{ data, total, page, limit }`) | `lib/contacts-api.ts` ← **bug** (expects res.data = array) |
| Auth | auth.controller.ts | `lib/auth-client.ts`, `app/(auth)/login/actions.ts`, signup, invite |
| Global wrap | `libs/common/src/interceptors/response.interceptor.ts` | `packages/dashboard-ui/lib/api.ts` (fetchWithAuth, fetchWithAuthFull) |
