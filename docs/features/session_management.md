# Session Management Feature Design

## Overview

This feature enables configurable session management for the application, allowing organization admins to control:

1.  **Session Duration**: How long a user can stay logged in (Absolute Max Duration).
2.  **Inactivity Timeout**: How long a user can be inactive before being logged out (Idle Timeout).
3.  **Session Reset**: Ability to force logout all users of an organization.

## User Requirements

- **Configurable**: Settings must be editable by Super Admins and Admins.
- **Scope**: Settings apply to all members of the organization.
- **Components**: Backend enforcement (token expiry) and Frontend enforcement (idle timer).

## Architecture Design

### 1. Database Schema

We will extend the `TenantEntity` (specifically the `settings` JSON column) to include session configuration.

```typescript
// libs/database/src/entities/tenant.entity.ts

export interface SessionSettings {
  /** Maximum session duration in minutes (e.g., 1440 for 24 hours). Default: 10080 (7 days) */
  maxDurationMinutes: number;

  /** Inactivity timeout in minutes (e.g., 30). Default: 30 */
  inactivityTimeoutMinutes: number;

  /**
   * Timestamp when sessions were last revoked/reset.
   * Any token issued before this time will be considered invalid.
   */
  sessionsRevokedAt?: string; // ISO Date string
}

export interface TenantSettings {
  // ... existing settings
  session?: SessionSettings;
}
```

### 2. Backend Logic (NestJS)

#### Authentication Flow (`AuthService`)

- **Login**: When generating a JWT:
  1.  Fetch `TenantSettings` for the user's tenant.
  2.  Read `maxDurationMinutes` (default to 7 days).
  3.  Sign the JWT with `expiresIn: maxDurationMinutes * 60`.
  4.  Payload should include the `tenantId` to facilitate validation.

#### Token Validation (`JwtStrategy`)

- **Revocation Check**:
  1.  In `validate()`, after fetching the user/tenant, check `tenant.settings.session.sessionsRevokedAt`.
  2.  Check `payload.iat` (issued at).
  3.  If `iat < sessionsRevokedAt`, throw `UnauthorizedException`.

#### Configuration API (`TenantController`)

- **Endpoint**: `PATCH /tenants/:id/settings/session` (or generic settings update).
- **Permissions**: Restricted to `admin` role via RBAC.
- **Reset Action**: A specific action/flag to update `sessionsRevokedAt` to `new Date()`.

### 3. Frontend Logic (Next.js)

#### Inactivity Monitor (`SessionManager.tsx`)

- Mounted in root layout (`layout.tsx`) for all authenticated pages.
- On mount, fetches `inactivityTimeoutMinutes` from `/tenants/current`.
- Uses `react-idle-timer` to detect user inactivity (no mouse/keyboard/touch/scroll).
- **On Idle**: Calls `logout('idle')` and redirects to `/login?reason=idle`.
- **Key behavior**: Uses React key prop to remount timer when settings change.

#### 401 Handling (`api.ts`)

- All API calls use `fetchWithAuth()` which handles 401 responses.
- On 401: Determines reason from error message (revoked/expired) and redirects to login.
- Logout reasons: `expired`, `revoked`, `idle`, `unauthorized`.

#### Session Settings UI (`SessionSettings.tsx`)

- Located at Settings > Session tab.
- Form fields:
  - Max Session Duration: Flexible input with value + unit selector (Minutes/Hours/Days).
  - Inactivity Timeout: Flexible input with value + unit selector (Minutes/Hours/Days).
  - Danger Zone: "Logout All Users" button (triggers Reset).
- Validation: Inactivity timeout must be less than max session duration.
- After save: Page reloads to apply new inactivity timeout immediately.

## How Each Setting Takes Effect

| Setting              | When Applied  | Notes                                                         |
| -------------------- | ------------- | ------------------------------------------------------------- |
| Max Session Duration | On next login | JWT is signed with configured expiration                      |
| Inactivity Timeout   | Immediately   | SessionManager remounts with new timeout                      |
| Log Out All Users    | Immediately   | Sets `sessionsRevokedAt`; any token issued before is rejected |

## Verification Plan

1.  **Unit Tests**: Verify `AuthService` respects the configured duration when signing tokens.
2.  **Integration Tests**: Test the full login flow with modified settings.
3.  **Manual**:
    - Set short inactivity timeout (e.g., 1 min). Stay idle (don't move mouse/type). Verify auto-logout.
    - Set short max duration (e.g., 2 mins). Log out and back in. Wait for expiry. Verify 401 redirect.
    - Trigger "Logout All Users". Verify immediate rejection and redirect for other sessions.
