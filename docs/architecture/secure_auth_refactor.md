# Secure Authentication Refactor Plan

## Objective
Remove the dependency on `localStorage` for storing authentication tokens. Transition to a **Cookie-Only** architecture using `HttpOnly` cookies and Next.js Proxy for maximum security against XSS attacks.

## Current State vs. Future State

| Feature | Current (Hybrid) | Future (Secure Cookie) |
| :--- | :--- | :--- |
| **Token Storage** | `HttpOnly Cookie` (Server) + `LocalStorage` (Client) | `HttpOnly Cookie` (Server Only) |
| **API Requests** | Client checks `localStorage` -> Proxy -> Backend | Client calls Proxy -> Proxy injects Header -> Backend |
| **State Hydration** | `AuthProvider` checks `localStorage` before fetching profile | `AuthProvider` always fetches profile (relies on Cookie) |
| **Security Risk** | High (XSS can steal LocalStorage token) | Low (Token invisible to JS) |

## Implementation Steps

### 1. Update `auth-client.ts`
*   **Remove** `setToken`, `getToken`, and `logout` (manual storage clearing) methods.
*   **Remove** manual `Authorization` header injection in `fetch` calls.
*   **Update** `getProfile` to simply call the endpoint. If the browser has the cookie, the Proxy will handle the rest.

### 2. Update `AuthProvider.tsx`
*   **Remove** the pre-check `if (!token) return`.
*   **Logic**: Always attempt to fetch `/auth/me` on mount.
    *   **Success (200)**: User is logged in. Set state.
    *   **Failure (401)**: User is logged out. Set partial state or redirect (handled by `middleware.ts`).

### 3. Update `LoginPage` (`page.tsx`)
*   **Remove** `authClient.setToken(result.token)`.
*   Let the Server Action handle the Cookie setting (already done).

### 4. Update Logout Flow
*   **Current**: Clears `localStorage`.
*   **Future**: Must call an API endpoint `/auth/logout` (or Server Action) to **clear the Cookie** from the browser. 
    *   *Note*: Simple client-side deletion isn't possible for HttpOnly cookies.

## Verification Plan
1.  **Clear LocalStorage**: Manually delete everything.
2.  **Login**: Verify success without new entries in LocalStorage.
3.  **Reload**: Verify `AuthProvider` still succeeds in fetching the user profile via Cookie.
4.  **Logout**: Verify Cookie is cleared.
