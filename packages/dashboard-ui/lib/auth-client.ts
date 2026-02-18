import { logoutAction } from "@/app/(auth)/login/actions";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  permissions: {
    global: string[];
    team: Record<string, string[]>;
  };
  /** When true, org requires 2FA and user has not set it; must complete 2FA setup before using the app. */
  twoFactorSetupRequired?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

const API_URL = ""; // Relative path for proxy

export const authClient = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/api/dashboard/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await res.json();
    // Token is now handled via HttpOnly Cookie by Server Action
    return data.data;
  },

  async signup(data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/api/dashboard/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Signup failed");
    }

    const responseData = await res.json();
    return responseData.data;
  },

  async getProfile(): Promise<User> {
    // No manual token check. Rely on Proxy + Cookie.
    const res = await fetch(`${API_URL}/api/dashboard/auth/me`, {
      credentials: "include",
      headers: {
        // 'Authorization': Bearer token is injected by the Next.js Proxy
      },
    });

    if (!res.ok) throw new Error("Failed to fetch profile");
    const data = await res.json();
    return data.data;
  },

  async updateProfile(data: { name: string }): Promise<User> {
    const res = await fetch(`${API_URL}/api/dashboard/auth/me`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to update profile");
    }
    const responseData = await res.json();
    return responseData.data ?? responseData;
  },

  // Helper to remove any stale local state if needed
  async logout() {
    await logoutAction();
  },
};
