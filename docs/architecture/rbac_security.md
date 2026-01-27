# Role-Based Access Control (RBAC) & Security Architecture

## Overview
The Analytics Dashboard employs a comprehensive RBAC system to manage user access across Global and Team scopes. This ensures that users only access resources pertinent to their role.

## 1. Role Hierarchy

### Global Roles
Global roles apply to the entire Tenant.
- **SUPER_ADMIN**: Full access to all settings, billing, and team management.
- **ADMIN**: Can manage most settings and teams but restricted from sensitive billing/owner actions.
- **AUDITOR**: Read-only access to global analytics and logs.
- **MEMBER**: Basic access. Can be assigned to Teams but has limited global visibility (e.g., cannot see Global Analytics).

### Team Roles
Team roles apply to specific Agent Teams within the Tenant.
- **MANAGER**: Can manage team members, view all team sessions, and configure team settings.
- **AGENT**: Can view and respond to assigned sessions.

## 2. Permission System

Permissions are granular strings (e.g., `analytics.view`, `teams.manage`) mapped to roles in the database.

### Key Permissions
| Permission | Scope | Description |
| :--- | :--- | :--- |
| `analytics.view` | Global | View global dashboards and reports. |
| `settings.manage` | Global | Access and modify tenant settings. |
| `teams.manage` | Global/Team | Create teams and manage memberships. |
| `session.view` | Team | View support sessions. |
| `session.manage` | Team | Respond to messages and close sessions. |

## 3. Backend Implementation

- **Service**: `RbacService` (in `apps/dashboard-api`) manages role-to-permission mapping and retrieval.
- **Authentication**: Usage of `LoginResponseDto` includes a `permissions` object:
    ```json
    {
      "global": ["analytics.view", "teams.manage"],
      "team": {
        "team_123": ["session.view", "session.manage"]
      }
    }
    ```
- **Guards**: Backend controllers check these roles/permissions using standard Guards (future enhancement, currently enforced via Service logic).

## 4. Frontend Architecture

The frontend (`dashboard-ui`) enforces permissions dynamically to improve UX and security.

### Components & Hooks
- **`AuthProvider`**: Manages the user session and stores the permission object.
- **`PermissionContext`**: Exposes `can(permission)` and `canTeam(permission, teamId)` methods.
- **`usePermission()`**: Hook to consume context.

### Route Protection
- **`RouteGuard`**: A wrapper component that checks permissions on page mount. Redirects unauthorized users.
    ```tsx
    <RouteGuard permission="teams.manage">
       <TeamManagementPage />
    </RouteGuard>
    ```
- **Smart Redirect (`/dashboard`)**: A routing page that directs users to their relevant home based on permissions (e.g., Agents -> Inbox, Admins -> Overview).

### UI Adaptation
- **Top Navigation**: Navigation items (e.g., "Teams", "Analytics") are hidden if the user lacks the required permission.
- **Conditional Rendering**: Buttons and tabs (e.g., "Invite Member") are hidden using `<PermissionGuard>`.

## 5. Authentication Architecture

The application uses a **Secure HttpOnly Cookie** strategy to protect user sessions and prevent XSS attacks.

### Key Components
1.  **HttpOnly Cookies**:
    *   **Generation**: On successful login/signup, the NEXTJS Server Actions (`loginAction`, `signupAction`) set a secure, HttpOnly cookie containing the JWT.
    *   **Security**: This cookie is **inaccessible to client-side JavaScript**, making it immune to XSS token theft.
    *   **Transport**: The browser automatically sends this cookie with every request to the domain.

2.  **Next.js Proxy (`app/api/[...path]/route.ts`)**:
    *   **Role**: Acts as a Backend-for-Frontend (BFF).
    *   **Mechanism**: Intercepts all requests to `/api/dashboard/*`.
    *   **Injection**: Reads the HttpOnly cookie, extracts the token, and injects it as an `Authorization: Bearer <token>` header before forwarding the request to the upstream Backend API (`dashboard-api`).
    *   **Benefit**: The Backend API remains stateless and standard (expecting Bearer tokens), while the Frontend enjoys high security.

3.  **Client-Side Data Fetching**:
    *   **"Naked" Fetch**: Client components (e.g., via `auth-client.ts` or React Query) simply call relative paths (e.g., `/api/dashboard/overview`).
    *   **No Storage**: LocalStorage/SessionStorage is **NOT** used for auth tokens. Clean and secure.

### Authentication Flows
*   **Login**: User credentials -> Server Action -> Backend Validate -> Set Cookie -> Redirect.
*   **Signup**: User details -> Server Action -> Backend Create -> Set Cookie -> Redirect.
*   **Data Load**: Component -> Proxy (Cookie->Header) -> Backend -> Data.
*   **Logout**: Client Click -> Server Action (`logoutAction`) -> Delete Cookie -> Redirect.
