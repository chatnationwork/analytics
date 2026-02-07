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

    if (
      responseData.requiresSessionVerification &&
      responseData.sessionVerificationRequestId
    ) {
      return {
        success: false,
        requiresSessionVerification: true,
        sessionVerificationMethod:
          responseData.sessionVerificationMethod ?? "email",
        sessionVerificationRequestId: responseData.sessionVerificationRequestId,
      };
    }

    if (
      responseData.requiresPasswordChange &&
      responseData.changePasswordToken
    ) {
      return {
        success: false,
        requiresPasswordChange: true,
        changePasswordToken: responseData.changePasswordToken,
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

export async function verifySessionTakeoverAction(params: {
  requestId?: string;
  code?: string;
  token?: string;
}) {
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const body: { requestId?: string; code?: string; token?: string } = {};
    if (params.requestId) body.requestId = params.requestId;
    if (params.code) body.code = params.code;
    if (params.token) body.token = params.token;

    const res = await fetch(
      `${API_URL}/api/dashboard/auth/verify-session-takeover`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json();
    const responseData = data.data ?? data;

    if (!res.ok) {
      return {
        success: false,
        error: data.message ?? "Invalid or expired verification",
      };
    }

    if (!responseData.accessToken || !responseData.user) {
      return { success: false, error: "Invalid response" };
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
    console.error("Verify session takeover error:", error);
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

export async function forgotPasswordAction(email: string) {
  const API_URL = process.env.SERVER_API_URL;
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    const responseData = data.data ?? data;
    if (!res.ok) {
      return {
        success: false,
        error: data.message ?? responseData?.message ?? "Request failed",
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Forgot password action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

export async function resetPasswordAction(token: string, newPassword: string) {
  const API_URL = process.env.SERVER_API_URL;
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim(), newPassword }),
    });
    const data = await res.json();
    const responseData = data.data ?? data;
    if (!res.ok) {
      return {
        success: false,
        error:
          data.message ?? responseData?.message ?? "Invalid or expired link",
      };
    }
    if (!responseData.accessToken || !responseData.user) {
      return { success: false, error: "Invalid response" };
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
    console.error("Reset password action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

export async function changePasswordAction(
  changePasswordToken: string,
  currentPassword: string,
  newPassword: string,
) {
  const API_URL = process.env.SERVER_API_URL;
  if (!API_URL) {
    return { success: false, error: "Server configuration error" };
  }
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${changePasswordToken}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();
    const responseData = data.data ?? data;

    if (!res.ok) {
      return {
        success: false,
        error:
          data.message || responseData.message || "Failed to change password",
      };
    }

    if (!responseData.accessToken || !responseData.user) {
      return { success: false, error: "Invalid response" };
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
    console.error("Change password action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}

/**
 * Set the session cookie (e.g. after changing password from Settings).
 * Call this with the new accessToken and expiresIn returned from change-password so the cookie stays in sync.
 */
export async function setSessionCookieAction(
  accessToken: string,
  expiresInSeconds: number,
) {
  const cookieStore = await cookies();
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresInSeconds,
    sameSite: "lax",
  });
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
