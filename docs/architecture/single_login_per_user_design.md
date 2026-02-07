# Single login per user (session takeover with verification)

## Goal

Only one active session per user. If they try to log in from another place while already logged in:

1. **Verify identity** (don’t issue tokens yet).
2. **If 2FA enabled**: send OTP → user enters code → invalidate other session → issue tokens here.
3. **If 2FA not enabled**: send verification to their email (link or code) → user verifies → invalidate other session → issue tokens here.

## Opinion

This is a good approach:

- **Verify first** avoids someone stealing a password and kicking the real user out without proving they control 2FA or email.
- **2FA path** reuses existing OTP flow; only the “replace session” step is new.
- **Email path** is the right fallback when 2FA is off; link or one-time code both work.

## High-level flow

```
[User on device B]  email + password  →  [Backend]
                                              ↓
                              Has this user an active session?
                              (session store: user_id → session_id)
                                    ↓                    ↓
                                   No                    Yes
                                    ↓                    ↓
                         Issue JWT (new session)   Do NOT issue JWT.
                         Store session_id.         Return:
                                                    requiresSessionVerification: true,
                                                    method: '2fa' | 'email',
                                                    requestId: '<opaque>'
                                                    ↓
                         [Frontend] Shows “Verify your identity”
                                    ↓
                    method === '2fa'          method === 'email'
                         ↓                          ↓
                  Send OTP (existing)        Send email with link/code
                  User enters code           User clicks link or enters code
                         ↓                          ↓
                  POST /auth/verify-session-takeover
                    body: { requestId, code } or { requestId, token }
                         ↓
                  Backend: verify code/token
                    → Update session store to NEW session_id
                    → Issue JWT with new session_id
                    → Old device’s JWT (old session_id) invalid
```

## Technical choices

### 1. Session store (where we record “current session” per user)

- **Option A – Redis**  
  Key: `session:user:${userId}`, value: `sessionId` (UUID).  
  TTL: none (or align with max JWT lifetime).  
  Pros: fast, one read per request (or only at login if we only validate at login).  
  Cons: need Redis in dashboard-api (today it’s only in agent-system for round-robin).

- **Option B – Database**  
  New table `user_sessions`: `user_id`, `session_id`, `created_at`.  
  One active row per user (upsert or “delete others then insert”).  
  Pros: no new infra, works with current stack.  
  Cons: DB read per request (or per login only).

**Recommendation:** Start with **DB** (one row per user: `user_id`, `session_id`, `updated_at`). Add Redis later if we want to avoid a DB hit on every request.

### 2. JWT payload

- Add **`sessionId`** (UUID) to the payload.
- Every login (normal or after session takeover) creates a new `sessionId`, stores it in the session store, and puts it in the JWT.

### 3. When to validate “single session”

- **Option A – On every request**  
  Guard or strategy: load `session_id` for user from store; if it doesn’t match JWT’s `sessionId`, return 401.  
  Ensures the other device is cut off as soon as the new login completes.

- **Option B – Only at login**  
  Don’t put sessionId in JWT; only at login check “does user already have a session?” and if yes, force verification then overwrite.  
  Old JWT stays valid until it expires (we don’t invalidate it explicitly).  
  So: **single new login**, but old session can still be used until JWT expiry.

**Recommendation:** **Option A** (validate on every request) so “log in here” really logs out elsewhere. Requires one store read per authenticated request (or short-lived in-memory cache of “valid sessionId” per user).

### 4. “Request” for verification (2FA or email)

- When we detect existing session, we create a **one-time request** (e.g. row in `session_takeover_requests`: `id`, `user_id`, `method`, `created_at`, `expires_at`).
- For 2FA: we send OTP and store the same `request_id` (or link request to the 2FA code row).
- For email: we send a link with a **token** (or a 6-digit code), store token/code in the same request row.
- When user verifies (2FA code or email token), we look up the request, confirm it’s valid and not expired, then: create new `sessionId`, update session store, delete request, issue JWT.

### 5. Email for non-2FA users

- **Link**: e.g. `https://app.example.com/verify-login?token=...`  
  Token stored in DB with expiry (e.g. 15 min).  
  Page calls `POST /auth/verify-session-takeover` with `token` (or backend handles GET with token and returns script that sets cookie and redirects).
- **Code**: Send 6-digit code by email; user types it in the same “Verify your identity” screen.  
  Same as 2FA flow but code from email instead of SMS/WhatsApp.

**Recommendation:** **Link** is simpler for users (one click). Reuse `EmailService` and a template similar to password reset.

## What to build

### Backend

1. **Session store**  
   Table (or Redis key) mapping `user_id` → `session_id`.  
   Helper: `getCurrentSessionId(userId)`, `setCurrentSessionId(userId, sessionId)`.

2. **JWT payload**  
   Include `sessionId` in payload.  
   In `generateLoginResponse` (and after session takeover): create `sessionId = randomUUID()`, store it, put in JWT.

3. **Login flow**  
   After password (and 2FA if applicable) success:
   - If “single login” is enabled (tenant setting or global):
     - If user already has a session in store **and** it’s different from any we’d have just issued (we’re not “replacing” yet):
       - Don’t issue JWT.
       - Create `session_takeover_request` (method: `2fa` | `email`).
       - If 2FA enabled: send OTP, link to this request.
       - If not: send email with link (token in request).
       - Return `requiresSessionVerification: true`, `method`, `requestId` (and optionally `twoFactorToken` for 2FA path).
   - Else: create new `sessionId`, store it, issue JWT as today.

4. **New endpoint**  
   `POST /auth/verify-session-takeover`  
   Body: `{ requestId, code? }` (2FA) or `{ token? }` (email link).  
   Verify request and code/token, then: set new `sessionId` in store, delete request, call `generateLoginResponse`, return login response (set cookie on frontend).

5. **Per-request validation**  
   In JWT strategy (or guard): after validating JWT, get `sessionId` from payload, get stored session for `user.id`. If mismatch → 401.

6. **Logout**  
   On logout, clear session store for this user (so next login doesn’t think there’s an existing session).

7. **Feature flag / tenant setting**  
   e.g. `tenant.settings.singleLoginEnforced: boolean` so you can turn this on per tenant.

### Frontend

1. **Login response**  
   If `requiresSessionVerification`: show “You’re logged in elsewhere. Verify your identity to log in here.”
   - If `method === '2fa'`: show OTP input (reuse 2FA component), submit with `requestId` + code.
   - If `method === 'email'`: show “We sent a link to your email. Click it to log in here.” Optional: “Enter code” if you use email code instead of link.

2. **Email link**  
   Route e.g. `/verify-login?token=...` that calls verify-session-takeover with token, then sets session cookie and redirects to dashboard.

3. **Logout**  
   Call logout as today; backend clears session store for user.

## Summary

- **Single session** = one `session_id` per user in a store; JWT carries `session_id`; we validate on each request (or at least at login and after takeover).
- **Login from new place** = detect existing session → return verification required (2FA or email) → user verifies → replace session in store → issue new JWT → old JWT becomes invalid.
- **2FA path**: reuse existing OTP send/verify; add “session takeover” step that replaces session and issues JWT.
- **Email path**: send link (or code), verify token/code in new endpoint, then same “replace session + issue JWT”.

If you want to proceed, next step is to implement the DB-backed session store and the login/verify-session-takeover flow (with a tenant or global flag to enable single login).
