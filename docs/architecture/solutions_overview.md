# Solutions Architecture - Tax App Integration

This document outlines how the generic Analytics Service defined in the System Architecture will be integrated specifically for the Tax App.

## 1. Tracking Strategy

### Identification
*   **Anonymous Users**:
    *   On first visit, generate a UUID `anonymous_id` and store in `localStorage`.
    *   Use this ID for all events until login.
*   **Authenticated Users**:
    *   On login (or OTP verification success), link the `anonymous_id` to the actual `user_id` (Taxpayer PIN or Phone Number).
    *   Send an `identify` event with user traits (Name, PIN, etc.).

### Session Tracking
*   **Session ID**: Generated client-side. Valid for 30 minutes of inactivity.
*   **Storage**: `sessionStorage` or `cookie`.
*   **Logic**: Reset if:
    *   No activity for 30 mins.
    *   Campaign parameters change (new UTM source).

## 2. Key Metrics & User Journeys

We will track the following core journeys to visualize user flow and drop-offs.

### Journey A: File & Pay (Monthly Rental Income - MRI)
**Funnel Steps:**
1.  **View Home**: `page_view` { path: "/" }
2.  **Start MRI**: `click` { element: "btn-mri-start" }
3.  **Validation**: `form_submit` { form: "mri-validation" }
4.  **OTP Verify**: `otp_verified` { service: "mri" }
5.  **View Return Form**: `page_view` { path: "/mri/rental-income" }
6.  **Submit Return**: `return_filed` { obligation: "mri" }
7.  **Initiate Payment**: `payment_initiated` { amount: X }
8.  **Complete**: `payment_success` or `process_complete`

### Journey B: Turnover Tax (TOT)
**Funnel Steps:**
1.  **View Home**
2.  **Start TOT**
3.  **Validation**
4.  **OTP Verify**
5.  **View Return Form**
6.  **Submit Return**
7.  **Initiate Payment**
8.  **Complete**

### Journey C: NIL Return
**Funnel Steps:**
1.  **View Home**
2.  **Start NIL**
3.  **Validation**
4.  **OTP Verify**
5.  **Select Obligation** (for NIL)
6.  **Submit Return**
7.  **Complete**

## 3. Data Collection Implementation

### Client-Side Integration (Next.js)
Since the app uses Next.js (App Router), we need a hybrid approach:
*   **Route Changes**: Listen to `usePathname` and `useSearchParams` to track virtual page views.
*   **Server Actions**: Some critical events (like "Return Filed" or "Payment Success") happen server-side. We should fire these events from the Server Actions to ensure 100% reliability, bypassing ad-blockers.

### Custom Events Dictionary
| Event Name | Trigger | Properties |
| :--- | :--- | :--- |
| `page_view` | User navigates to a new route | `path`, `referrer`, `title` |
| `button_click` | Generic button tracking | `label`, `id`, `page_location` |
| `validation_success` | User enters valid PIN/ID | `obligation_type` |
| `otp_success` | User verifies OTP | `method` (whatsapp/sms) |
| `filing_started` | User lands on the return form | `obligation_type` |
| `return_filed` | Successful API response for filing | `receipt_number`, `obligation` |
| `payment_initiated` | User clicks Pay | `amount`, `prn` |
| `app_error` | Error boundary or API error | `error_code`, `message` |

## 4. Privacy & Compliance
*   **PII Masking**: Ensure `taxpayer_pin` is hashed or stored in a secure 'identified' table, not in the raw event stream if possible (or accept it as internal PII).
*   **Phone Numbers**: Should be hashed/masked unless explicitly needed for support lookup.
