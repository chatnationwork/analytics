/**
 * Server actions for the post-signup 2FA setup flow.
 * Proxies requests to the backend 2FA setup endpoints, forwarding the
 * auth cookie so the user's JWT is included.
 */

"use server";

import { cookies } from "next/headers";

const API_URL = process.env.SERVER_API_URL;
if (!API_URL) {
  throw new Error("SERVER_API_URL environment variable is required");
}

/**
 * Send a verification code to the given phone number via WhatsApp.
 * Returns a token that must be passed to verifySetupCodeAction.
 */
export async function sendSetupCodeAction(phone: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    const res = await fetch(`${API_URL}/api/dashboard/auth/2fa/send-setup-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Failed to send code" };
    }

    const responseData = data.data || data;
    return { success: true, token: responseData.token };
  } catch (error) {
    console.error("sendSetupCodeAction error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

/**
 * Verify the OTP code and enable 2FA with the verified phone number.
 * On success, 2FA is enabled and the user can proceed to the dashboard.
 */
export async function verifySetupCodeAction(
  token: string,
  code: string,
  phone: string,
): Promise<{
  success: boolean;
  twoFactorEnabled?: boolean;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    const res = await fetch(`${API_URL}/api/dashboard/auth/2fa/verify-setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ token, code, phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Verification failed" };
    }

    const responseData = data.data || data;
    return { success: true, twoFactorEnabled: responseData.twoFactorEnabled };
  } catch (error) {
    console.error("verifySetupCodeAction error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}
