"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { LogOut, User, Shield } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logoutAction } from "@/app/(auth)/login/actions";
import { authClient } from "@/lib/auth-client";
import { agentApi } from "@/lib/api/agent";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Display labels and backend (status, reason) values. Online = available for assignments. */
const STATUS_OPTIONS = [
  { value: "available", label: "Available", status: "online" as const },
  { value: "busy", label: "Busy", status: "online" as const },
  { value: "unavailable", label: "Unavailable", status: "offline" as const },
  { value: "off_shift", label: "Off Shift", status: "offline" as const },
  { value: "on_leave", label: "On Leave", status: "offline" as const },
] as const;

function reasonToOption(reason: string | null, status: "online" | "offline") {
  const r = (reason ?? "").trim().toLowerCase();
  const match = STATUS_OPTIONS.find(
    (o) =>
      o.value === r || (status === o.status && (r === "" || o.value === r)),
  );
  if (match) return match.value;
  if (status === "online") return "available";
  return "unavailable";
}

export function DashboardHeader() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{
    name: string | null;
    email: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: presence, isLoading: presenceLoading } = useQuery({
    queryKey: ["agent", "presence"],
    queryFn: () => agentApi.getPresence(),
  });

  useEffect(() => {
    authClient
      .getProfile()
      .then((u) => setUser({ name: u.name ?? null, email: u.email }))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  const handleStatusChange = useCallback(
    async (value: string) => {
      const option = STATUS_OPTIONS.find((o) => o.value === value);
      if (!option) return;
      try {
        await agentApi.setPresence(option.status, option.value);
        await queryClient.invalidateQueries({
          queryKey: ["agent", "presence"],
        });
        toast.success(`Status set to ${option.label}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    },
    [queryClient],
  );

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await logoutAction();
  };

  const currentOption =
    presence && reasonToOption(presence.reason ?? null, presence.status);

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/95 flex items-center justify-end gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Select
          value={currentOption ?? "unavailable"}
          onValueChange={handleStatusChange}
          disabled={presenceLoading}
        >
          <SelectTrigger
            className="w-[140px] h-9 text-sm"
            aria-label="Agent status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative shrink-0" ref={profileRef}>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground max-w-[200px]"
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Profile menu"
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate" title={user?.email ?? undefined}>
              {user?.name ?? user?.email ?? "—"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Profile menu"
          >
            <User className="h-4 w-4" />
          </Button>
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-md border bg-popover text-popover-foreground shadow-md py-1"
              role="menu"
            >
              <Link
                href="/settings/security"
                role="menuitem"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-none"
                onClick={() => setProfileOpen(false)}
              >
                <Shield className="h-4 w-4 shrink-0" />
                Security
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-none text-left"
                onClick={() => {
                  setProfileOpen(false);
                  void handleLogout();
                }}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
