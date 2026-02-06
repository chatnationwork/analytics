"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, authClient } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  /** Refetch profile (e.g. after completing required 2FA setup). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { SessionExpiredDialog } from "../session/SessionExpiredDialog";

/** Paths allowed when org requires 2FA and user has not set it (only Settings → Security). */
function isAllowedWithout2Fa(pathname: string): boolean {
  if (pathname.startsWith("/login")) return true;
  if (pathname === "/settings" || pathname === "/settings/security")
    return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      // Always attempt to fetch profile via Cookie
      try {
        const profile = await authClient.getProfile();
        setUser(profile);
      } catch (error) {
        console.error(
          "Failed to load profile (likely unauthenticated):",
          error,
        );
        // Do not force logout redirect here, allow Middleware to handle protection
        // or just leave user as null (public view)
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Enforce 2FA: when org requires 2FA and user has not set it, only allow Settings (Security) and login
  useEffect(() => {
    if (isLoading || !user?.twoFactorSetupRequired) return;
    const path = pathname ?? "";
    if (isAllowedWithout2Fa(path)) return;
    router.replace("/settings/security?setup2fa=1");
  }, [user?.twoFactorSetupRequired, isLoading, pathname, router]);

  const login = (_token: string, user: User) => {
    // Token is handled by HttpOnly cookie (set by server action)
    // Just update the user state - let caller handle navigation
    setUser(user);
  };

  const refreshUser = async () => {
    try {
      const profile = await authClient.getProfile();
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  const logout = () => {
    authClient.logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refreshUser }}
    >
      {children}
      <SessionExpiredDialog onLogout={logout} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
