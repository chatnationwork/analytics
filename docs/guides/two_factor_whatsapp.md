# Two-Factor Authentication (WhatsApp)

Users can enable two-factor authentication (2FA) so that after entering email and password, they must enter a 6-digit code sent to their WhatsApp number to complete login.

## Flow

1. **Enable 2FA**: In **Settings → Security**, turn on "Two-factor authentication" and save a WhatsApp phone number (digits only, e.g. `254712345678`).
2. **Login**: When 2FA is enabled, after a correct email/password the backend does not return a JWT. Instead it:
   - Generates a 6-digit code and stores it in `two_fa_verification` with a one-time token and 10-minute expiry.
   - Sends the code via WhatsApp using the **2fa** template and the **first active CRM integration** for the user’s organisation (same credentials as agent inbox / campaigns).
   - Returns `{ requiresTwoFactor: true, twoFactorToken: "..." }`.
3. **Verify**: The user enters the code; the client calls `POST /auth/2fa/verify` with `{ twoFactorToken, code }`. On success, the backend returns the normal login response (JWT and user).
4. **Resend**: From the 2FA code screen the user can tap "Resend code". The client calls `POST /auth/2fa/resend` with `{ twoFactorToken }`. The backend issues a new 6-digit code, updates the same pending row (invalidating the old code), and sends it via WhatsApp. A 60-second cooldown prevents abuse.

## Backend

- **User**: `users.two_factor_enabled`, `users.phone` (digits only).
- **Pending codes**: `two_fa_verification` (token, userId, code, expiresAt). Row is deleted after successful verify or expiry.
- **Endpoints**:
  - `GET /auth/2fa/status` – current user’s 2FA status and masked phone (requires JWT).
  - `PATCH /auth/2fa` – enable/disable 2FA and set phone (requires JWT). Phone required when enabling.
  - `POST /auth/2fa/verify` – verify code and complete login (no JWT; public).
  - `POST /auth/2fa/resend` – resend a new code for the same attempt; body `{ twoFactorToken }`. Invalidates the previous code and extends expiry (no JWT; public).

## WhatsApp template

The code is sent using the Meta WhatsApp template **2fa** with:

- **Body**: one text parameter = the 6-digit code.
- **Button** (if present): one text parameter (same code or placeholder, depending on template design).

Sending uses the tenant’s first active CRM integration (same as inbox/campaigns). Ensure the **2fa** template is approved and the CRM has a valid WhatsApp Business number and token.

## Frontend

- **Settings → Security**: Toggle 2FA and set/update phone. Phone is required to turn 2FA on.
- **Login**: If the login response has `requiresTwoFactor` and `twoFactorToken`, the UI shows a code input and calls the verify action on submit; on success it sets the session and redirects. A "Resend code" button is available with a 60-second cooldown.

## Requirements

- At least one **active CRM integration** with WhatsApp configured (phone number ID and API key) for the user’s organisation.
- Approved **2fa** template in Meta Business Manager for that WhatsApp number.
