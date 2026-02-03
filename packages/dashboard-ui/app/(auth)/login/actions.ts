"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// SERVER_API_URL for server-side calls (e.g., http://dashboard-api:3001 in Docker)
const API_URL = process.env.SERVER_API_URL;

export async function loginAction(email: string, password: string) {
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Login failed" };
    }

    const responseData = data.data ?? data;

    if (responseData.requiresTwoFactor && responseData.twoFactorToken) {
      return {
        success: false,
        requiresTwoFactor: true,
        twoFactorToken: responseData.twoFactorToken,
      };
    }

    if (!responseData.accessToken || !responseData.user) {
      return { success: false, error: "Invalid login response" };
    }

    const cookieStore = await cookies();
    cookieStore.set("accessToken", responseData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: responseData.expiresIn ?? 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return {
      success: true,
      token: responseData.accessToken,
      user: responseData.user,
    };
  } catch (error) {
    console.error("Login action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

export async function verify2FaAction(twoFactorToken: string, code: string) {
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ twoFactorToken, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Invalid or expired code",
      };
    }

    const responseData = data.data ?? data;

    if (!responseData.accessToken || !responseData.user) {
      return { success: false, error: "Invalid verify response" };
    }

    const cookieStore = await cookies();
    cookieStore.set("accessToken", responseData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: responseData.expiresIn ?? 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return {
      success: true,
      token: responseData.accessToken,
      user: responseData.user,
    };
  } catch (error) {
    console.error("Verify 2FA action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

export async function resend2FaAction(twoFactorToken: string) {
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/2fa/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ twoFactorToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Could not resend code" };
    }

    return { success: true };
  } catch (error) {
    console.error("Resend 2FA action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const API_URL = process.env.SERVER_API_URL;
  if (token && API_URL) {
    try {
      await fetch(`${API_URL}/api/dashboard/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Best-effort: still clear cookie and redirect
    }
  }
  cookieStore.delete("accessToken");
  redirect("/login");
}
