"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.SERVER_API_URL;

export async function signupAction(payload: any) {
  try {
    const res = await fetch(`${API_URL}/api/dashboard/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Signup failed" };
    }

    const responseData = data.data || data;

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("accessToken", responseData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return {
      success: true,
      token: responseData.accessToken,
      user: responseData.user,
    };
  } catch (error) {
    console.error("Signup action error:", error);
    return { success: false, error: "Network error or server unavailable" };
  }
}
