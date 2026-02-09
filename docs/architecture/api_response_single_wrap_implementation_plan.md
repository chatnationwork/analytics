# Implementation Plan: Single-Wrap API Responses (No Double-Wrap)

This plan removes double-wrap and defensive unwraps so that **one rule** holds everywhere: the backend returns the payload directly; the interceptor wraps it once; the frontend uses `fetchWithAuth` (or `fetchWithAuthFull` + `res.data`) and gets the payload with no extra `.data` unwrapping.

**Reference:** [API Response Double-Wrap Review](./api_response_double_wrap_review.md) (inventory and current state).

---

## 1. Target state (the rule)

| Layer | Rule |
|-------|------|
| **Backend** | Controllers return the **payload directly**: entity, array, or a single object (e.g. `{ data: array, total }` for pagination). Never return `{ data: X }` when `X` is the only thing the client should see. |
| **Interceptor** | Unchanged: wraps every response as `{ status, data: <controller_return>, timestamp }`. |
| **Frontend** | Use `fetchWithAuth` when the response is a single payload → get `json.data` = that payload. Use `fetchWithAuthFull` only when you need the full body; then `res.data` is the payload. No defensive `?.data ?? x` for “maybe double-wrapped” responses. |

Pagination stays as one object: backend returns `{ data: entries, total }` (or `{ data, total, page, limit }`); interceptor wraps once; client gets that object and uses `.data` for the array and `.total` (etc.) for metadata. That is **not** double-wrap; it’s the intended payload shape.

---

## 2. Phases (order of work)

Work in this order so backend and frontend stay in sync and we can test area by area.

---

### Phase 1: Confirm backend – no `{ data: entity }` returns

**Goal:** Ensure no controller returns `{ data: <single_entity> }` so that after the interceptor the client would see `data: { data: entity }`.

**Steps:**

1. **Audit all dashboard-api controllers**
   - Search for `return { data:` in `apps/dashboard-api/src/**/*.controller.ts`.
   - For each hit, confirm:
     - Either it’s **pagination** (returning a single object like `{ data: array, total }`) → OK.
     - Or it’s a **single entity/array** wrapped in `{ data: x }` → change to `return x`.
   - From the review, contact-profile is already fixed. Double-check any other controller that might return `{ data: contact }`, `{ data: note }`, etc.

2. **Document**
   - In the double-wrap review doc or this plan, add a one-line note: “Audit completed on <date>: no controller returns `{ data: single_entity }`.”

**Deliverable:** Backend is the single source of truth: one wrap only.

**No frontend changes in this phase.**

**Audit completed:** Grep of `apps/dashboard-api/src/**/*.controller.ts` for `return { data:` found no matches. Contact-profile and all other controllers return the payload directly (or a single pagination object). No double-wrap in backend.

---

### Phase 2: Fix contacts API (WhatsApp contacts list)

**Goal:** Align frontend with backend for `GET /whatsapp/contacts`. Backend returns `{ data, total, page, limit }`; frontend must treat `res.data` as that object, not as the array.

**Steps:**

1. **Frontend: `packages/dashboard-ui/lib/contacts-api.ts`**
   - Use `fetchWithAuthFull` (or keep it).
   - After `const res = await fetchWithAuthFull(...)`:
     - Treat `res` as `{ status, data, timestamp }` (interceptor shape).
     - So the payload is `res.data` = `{ data: Contact[], total, page, limit }`.
     - Replace the current check:
       - Instead of “if `res.data` is not an array, throw”, use: “payload = res.data; if payload is not an object or !Array.isArray(payload.data), throw or return safe default.”
     - Return `{ data: payload.data, total: payload.total, page: payload.page, limit: payload.limit }` (or equivalent).
   - No backend change if we keep backend returning `{ data, total, page, limit }`.

2. **Verify**
   - Contacts page (or any consumer of `contactsApi.getContacts`) loads and shows the list and pagination.

**Deliverable:** Contacts list works with the existing backend response shape; no double-wrap on the client.

---

### Phase 3: Simplify contact profile frontend (agent inbox)

**Goal:** Remove defensive double-wrap handling in ContactProfilePanel and agent API; assume backend always returns raw (already the case).

**Steps:**

1. **`packages/dashboard-ui/components/agent-inbox/ContactProfilePanel.tsx`**
   - **fetchProfile:** After `const data = await agentApi.getContactProfile(...)`:
     - Assume `data` is `ContactProfile | null` (or the contact object). Remove the branch that does `(data as { data?: ContactProfile })?.data ?? null`. Use `data` as the contact (with a null check if the API can return null/empty).
   - **fetchNotes:** After `const data = await agentApi.getContactNotes(...)`:
     - Assume `data` is `ContactNote[]`. Remove the branch that uses `(data as { data: ContactNote[] }).data`. Use `Array.isArray(data) ? data : []` only for safety (e.g. if API returns null).
   - **handleAddNote:** After `const raw = await agentApi.addContactNote(...)`:
     - Assume `raw` is `ContactNote`. Remove `(raw as { data?: ContactNote })?.data ?? raw`. Use `raw` as the note (with a guard if needed).

2. **`packages/dashboard-ui/lib/api/agent/index.ts`**
   - **getContactHistory / getContactResolutions:** They use `fetchWithAuthFull` and then `payload = res?.data` and `payload?.data` / `payload?.total`. Backend returns a single object `{ data: entries, total }`, so after one wrap `res.data` is that object. So `payload.data` is the array and `payload.total` is the number. This is correct; no change needed unless we want to switch to `fetchWithAuth` and then the return type is `{ data, total }` directly and we could simplify to `return res` (if we use fetchWithAuth for these two). Optional: switch to `fetchWithAuth` for history/resolutions and return `res` so callers get `{ data, total }` without touching `res.data` (minor cleanup).

**Deliverable:** Contact profile panel and agent API assume single-wrap only; no defensive “maybe double-wrapped” logic.

---

### Phase 4: Optional defensive unwraps elsewhere

**Goal:** Decide which “defensive” unwraps to keep for resilience vs remove for clarity.

**Candidates (do not change behavior; only simplify if we want strict single-wrap):**

1. **`packages/dashboard-ui/app/(auth)/login/actions.ts` (and signup/invite)**  
   - Currently: `const responseData = data.data ?? data`.  
   - Keeps working if backend ever sends the payload at top level (no wrap).  
   - **Option A:** Keep as-is for resilience.  
   - **Option B:** Once backend is guaranteed to use the interceptor for auth, use `const responseData = data.data` and document that auth responses are always wrapped.

2. **`packages/dashboard-ui/lib/api.ts`**  
   - Tenant / 2FA helpers that do `res.data ?? res`.  
   - Same choice: keep for resilience or tighten to `res.data` and document.

3. **`packages/dashboard-ui/lib/api/agent/index.ts`**  
   - **assignQueue:** Unwraps `(res as { data?: { assigned } })?.data ?? (res as { assigned })`.  
   - **Option:** If backend always returns `{ assigned: number }`, use `fetchWithAuth` and then the return is that object; remove the dual unwrap.  
   - **uploadMedia:** `return (json.data ?? json)` – same: keep for resilience or assume wrap and use `json.data`.

**Recommendation:** In Phase 4, only change these if we want to enforce “no defensive unwrap” everywhere. Otherwise leave as-is and document that they are intentional fallbacks.

**Deliverable:** Either (a) all defensive unwraps removed and doc updated, or (b) list of “intentional fallbacks” added to the review doc.

---

### Phase 5: Document the contract and prevent regression

**Goal:** One place that defines the API response contract so new code doesn’t reintroduce double-wrap.

**Steps:**

1. **Add a short “API response contract” section** (e.g. in the double-wrap review doc or in a `docs/api-contract.md`):
   - All successful JSON responses from dashboard API have the shape `{ status, data, timestamp }` (ResponseInterceptor).
   - Controllers must return the payload directly (entity, array, or one object). Never return `{ data: X }` when X is the single payload the client should see.
   - Frontend: `fetchWithAuth` returns that payload (`json.data`). `fetchWithAuthFull` returns the full body; use `res.data` for the payload. Pagination payloads are one object, e.g. `{ data: array, total }`; use `.data` for the array and `.total` (etc.) for metadata.

2. **Optional: checklist in PR template or CONTRIBUTING**
   - “New REST endpoints: controller returns payload directly (no `{ data: entity }` for single-entity responses).”

3. **Update the double-wrap review doc**
   - Mark “Implementation plan completed” and link to this plan.
   - In “Summary”, note that contacts-api was fixed and ContactProfilePanel/agent API were simplified; optional Phase 4 items listed.

**Deliverable:** Contract documented; future contributors have a clear rule and optional checklist.

---

## 3. Summary table

| Phase | Scope | Backend | Frontend | Risk |
|-------|--------|---------|----------|------|
| 1 | Audit | Confirm no `return { data: entity }` | None | None |
| 2 | Contacts | None (or optional) | contacts-api.ts: use payload = res.data, then payload.data / payload.total | Low |
| 3 | Contact profile | None | ContactProfilePanel + optional agent API history/resolutions | Low |
| 4 | Defensive unwraps | None | login/actions, api.ts, agent assignQueue/uploadMedia (optional) | Low |
| 5 | Docs | None | None | None |

---

## 4. Testing (per phase)

- **Phase 1:** Grep + manual scan; no runtime tests required.
- **Phase 2:** Load contacts page (or wherever `contactsApi.getContacts` is used); verify list and pagination.
- **Phase 3:** Inbox → open a contact profile; verify profile, notes, history, and add note. No “Unknown” / “Invalid date” or empty list.
- **Phase 4:** If you change auth/tenant/assignQueue/uploadMedia, run login, tenant switch, queue assign, media upload.
- **Phase 5:** N/A.

---

## 5. Rollback

- Phase 1: No code change; no rollback.
- Phase 2–4: Revert the touched files; backend is unchanged except possibly Phase 1 audit fixes (revert those too if any).
- Phase 5: Doc only; revert the doc edits if needed.

---

## 6. Out of scope (no change)

- **ResponseInterceptor:** Stays as-is (one wrap).
- **fetchWithAuth / fetchWithAuthFull:** Behavior unchanged; we only stop relying on double-wrap and remove defensive unwraps.
- **Pagination shape:** Backend continues to return one object `{ data: array, total }` (or with page/limit); frontend continues to use that object’s `.data` and `.total`. This is the intended payload, not double-wrap.
- **Dashboard pages** that use `trend?.data ?? []`: They receive the payload (e.g. `{ data: trendArray }`) from `fetchWithAuth`; using `.data` is correct. No change.

This plan gives a clear path to a single-wrap world without coding yet; implement in the order above and adjust only the files listed.
