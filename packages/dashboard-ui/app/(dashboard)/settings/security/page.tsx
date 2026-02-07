"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePermission } from "@/components/auth/PermissionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Lock, AlertCircle } from "lucide-react";
import { setSessionCookieAction } from "@/app/(auth)/login/actions";

/** Shape of tenant.settings.passwordComplexity (must match backend) */
interface PasswordComplexityConfig {
  minLength: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
  maxLength?: number;
}

const DEFAULT_PASSWORD_COMPLEXITY: PasswordComplexityConfig = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecial: false,
  maxLength: 128,
};

/**
 * Security settings page: 2FA and (for super admins) password complexity for new users.
 */
function SettingsSecurityContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { login, user: currentUser, refreshUser } = useAuth();
  const canConfigurePasswordComplexity = can("settings.password_complexity");
  const canConfigureTwoFactor = can("settings.two_factor");
  const canManageSettings = can("settings.manage");
  const isMandatorySetup =
    currentUser?.twoFactorSetupRequired === true ||
    searchParams.get("setup2fa") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMessage, setChangePasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => api.get2FaStatus(),
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-current"],
    queryFn: () => api.getCurrentTenant(),
    enabled:
      canConfigurePasswordComplexity ||
      canConfigureTwoFactor ||
      canManageSettings,
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [passwordComplexity, setPasswordComplexity] =
    useState<PasswordComplexityConfig>(DEFAULT_PASSWORD_COMPLEXITY);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<
    number | "" | null
  >(null);
  const [passwordComplexityMessage, setPasswordComplexityMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (status) {
      setTwoFactorEnabled(status.twoFactorEnabled);
      // Don't overwrite phone if user is typing
      if (!phone && status.phone) {
        // Status returns masked phone, so we don't populate for editing
        // User must re-enter to update
      }
    }
  }, [status, phone]);

  const tenantTwoFactorRequired = Boolean(
    (tenant?.settings as { twoFactorRequired?: boolean } | undefined)
      ?.twoFactorRequired,
  );

  useEffect(() => {
    const settings = tenant?.settings as
      | {
          passwordComplexity?: PasswordComplexityConfig;
          passwordExpiryDays?: number | null;
          twoFactorRequired?: boolean;
        }
      | undefined;
    const pc = settings?.passwordComplexity;
    if (pc && typeof pc === "object") {
      setPasswordComplexity({
        minLength:
          typeof pc.minLength === "number"
            ? pc.minLength
            : DEFAULT_PASSWORD_COMPLEXITY.minLength,
        requireUppercase: Boolean(pc.requireUppercase),
        requireLowercase: Boolean(pc.requireLowercase),
        requireNumber: Boolean(pc.requireNumber),
        requireSpecial: Boolean(pc.requireSpecial),
        maxLength:
          typeof pc.maxLength === "number"
            ? pc.maxLength
            : DEFAULT_PASSWORD_COMPLEXITY.maxLength,
      });
    }
    const expiry = settings?.passwordExpiryDays;
    setPasswordExpiryDays(
      expiry != null && typeof expiry === "number" && expiry > 0 ? expiry : "",
    );
  }, [tenant?.settings]);

  const update2Fa = useMutation({
    mutationFn: (body: { twoFactorEnabled?: boolean; phone?: string }) =>
      api.update2Fa(body),
    onSuccess: (data) => {
      queryClient.setQueryData(["2fa-status"], data);
      setTwoFactorEnabled(data.twoFactorEnabled);
      setPhone(""); // Clear after successful save
      setMessage({ type: "success", text: "Security settings saved." });
      setTimeout(() => setMessage(null), 4000);
      if (currentUser?.twoFactorSetupRequired) {
        refreshUser();
      }
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  /**
   * Handle toggling 2FA on/off.
   * When enabling, requires a valid phone number to be entered first.
   */
  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      if (enabled) {
        const digits = phone.replace(/\D/g, "").trim();
        if (digits.length < 10 || digits.length > 15) {
          setMessage({
            type: "error",
            text: "Enter a valid phone number (10–15 digits) to enable 2FA.",
          });
          setSaving(false);
          return;
        }
        await update2Fa.mutateAsync({ twoFactorEnabled: true, phone: digits });
      } else {
        await update2Fa.mutateAsync({ twoFactorEnabled: false });
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle updating the phone number when 2FA is already enabled.
   */
  const handleSavePhone = async () => {
    const digits = phone.replace(/\D/g, "").trim();
    if (digits.length < 10 || digits.length > 15) {
      setMessage({ type: "error", text: "Phone must be 10–15 digits." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await update2Fa.mutateAsync({ phone: digits });
    } finally {
      setSaving(false);
    }
  };

  // Check if phone input has a valid number (for enabling the toggle)
  const phoneDigits = phone.replace(/\D/g, "").trim();
  const hasValidPhone = phoneDigits.length >= 10 && phoneDigits.length <= 15;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Security</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading…</p>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setChangePasswordMessage({
        type: "error",
        text: "New passwords do not match.",
      });
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    setChangePasswordLoading(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      await setSessionCookieAction(result.accessToken, result.expiresIn);
      login(result.accessToken, {
        ...result.user,
        name: result.user.name ?? null,
        avatarUrl:
          (result.user as { avatarUrl?: string | null }).avatarUrl ??
          currentUser?.avatarUrl ??
          null,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordMessage({
        type: "success",
        text: "Password updated successfully.",
      });
      setTimeout(() => setChangePasswordMessage(null), 4000);
    } catch (err) {
      setChangePasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change password",
      });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Two-factor authentication (2FA) via WhatsApp
        </p>
      </div>

      {isMandatorySetup && !twoFactorEnabled && (
        <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/15 p-5 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-base">
              Set up 2FA to access the rest of the app
            </p>
            <p className="text-sm text-muted-foreground">
              Your organization requires two-factor authentication. You
              currently only have access to this Security page. Add your
              WhatsApp number below and turn on 2FA to unlock Inbox, Analytics,
              and all other features.
            </p>
          </div>
        </div>
      )}

      {/* Change password (any authenticated user) */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-medium text-foreground">
              Change password
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set a new password. It must meet your organization&apos;s password
              rules (see below if you have permission to configure them).
            </p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {changePasswordMessage && (
            <div
              className={`text-sm p-3 rounded-md ${
                changePasswordMessage.type === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {changePasswordMessage.text}
            </div>
          )}
          <Button type="submit" disabled={changePasswordLoading}>
            {changePasswordLoading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        {/* Phone number input - always visible */}
        <div className="space-y-2">
          <Label htmlFor="2fa-phone">WhatsApp phone number</Label>
          <p className="text-sm text-muted-foreground">
            {twoFactorEnabled
              ? "Update your WhatsApp number for receiving 2FA codes."
              : "Enter your WhatsApp number to enable 2FA. Digits only (e.g. 254712345678)."}
          </p>
          <div className="flex gap-2">
            <Input
              id="2fa-phone"
              type="tel"
              placeholder="254712345678"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))
              }
              className="max-w-xs font-mono"
            />
            {twoFactorEnabled && (
              <Button
                type="button"
                onClick={handleSavePhone}
                disabled={saving || update2Fa.isPending || !hasValidPhone}
              >
                Update
              </Button>
            )}
          </div>
          {status?.phone && (
            <p className="text-sm text-muted-foreground">
              Current number: {status.phone}
            </p>
          )}
        </div>

        {/* 2FA: toggle only for users with settings.two_factor; others can only enable or update phone */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <Label
              htmlFor={canConfigureTwoFactor ? "2fa-toggle" : undefined}
              className="text-base font-medium"
            >
              Two-factor authentication
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tenantTwoFactorRequired && twoFactorEnabled
                ? "2FA is required by your organization and is enabled."
                : twoFactorEnabled
                  ? "2FA is enabled. You'll receive a 6-digit code on WhatsApp at login."
                  : hasValidPhone
                    ? canConfigureTwoFactor
                      ? "Click to enable 2FA with the phone number above."
                      : "Enter your phone number above and click Enable 2FA."
                    : "Enter a valid phone number above to enable 2FA."}
            </p>
          </div>
          {canConfigureTwoFactor ? (
            <Switch
              id="2fa-toggle"
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle}
              disabled={
                saving ||
                update2Fa.isPending ||
                (!twoFactorEnabled && !hasValidPhone) ||
                (tenantTwoFactorRequired && twoFactorEnabled)
              }
            />
          ) : twoFactorEnabled ? (
            <span className="text-sm text-muted-foreground">2FA is on</span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving || update2Fa.isPending || !hasValidPhone}
              onClick={() => handleToggle(true)}
            >
              Enable 2FA
            </Button>
          )}
        </div>

        {message && (
          <div
            className={`text-sm p-3 rounded-md ${
              message.type === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Require 2FA for organization (users with settings.two_factor, e.g. super admins) */}
      {canConfigureTwoFactor && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-base font-medium text-foreground">
                Require 2FA for organization
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                When enabled, all users in this organization must set up
                two-factor authentication (phone number) before they can use the
                app.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="org-2fa-required" className="text-sm">
              Require 2FA for all users
            </Label>
            <Switch
              id="org-2fa-required"
              checked={tenantTwoFactorRequired}
              onCheckedChange={async (checked) => {
                try {
                  await api.updateTenantSettings({
                    twoFactorRequired: checked,
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["tenant-current"],
                  });
                } catch (err) {
                  setMessage({
                    type: "error",
                    text:
                      err instanceof Error
                        ? err.message
                        : "Failed to update setting",
                  });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Password complexity (super admins only) */}
      {canConfigurePasswordComplexity && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-base font-medium text-foreground">
                Password complexity
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Rules applied when new users set a password (e.g. when claiming
                an invite).
              </p>
            </div>
          </div>

          <div className="space-y-4 pb-4 border-b border-border">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="passwordExpiryDays">Password expiry (days)</Label>
              <Input
                id="passwordExpiryDays"
                type="number"
                min={0}
                max={365}
                placeholder="No expiry"
                value={
                  passwordExpiryDays === "" ? "" : (passwordExpiryDays ?? "")
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setPasswordExpiryDays("");
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0 && n <= 365) {
                    setPasswordExpiryDays(n === 0 ? "" : n);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Require users to change password after this many days. Leave
                empty or 0 for no expiry.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pc-minLength">Minimum length</Label>
              <Input
                id="pc-minLength"
                type="number"
                min={6}
                max={64}
                value={passwordComplexity.minLength}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n) && n >= 6 && n <= 64) {
                    setPasswordComplexity((prev) => ({
                      ...prev,
                      minLength: n,
                    }));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-maxLength">Maximum length (optional)</Label>
              <Input
                id="pc-maxLength"
                type="number"
                min={0}
                max={256}
                placeholder="128"
                value={passwordComplexity.maxLength ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === "" ? undefined : parseInt(v, 10);
                  setPasswordComplexity((prev) => ({
                    ...prev,
                    maxLength:
                      n !== undefined && !Number.isNaN(n) && n > 0
                        ? n
                        : undefined,
                  }));
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={passwordComplexity.requireUppercase ?? false}
                onCheckedChange={(checked) =>
                  setPasswordComplexity((prev) => ({
                    ...prev,
                    requireUppercase: Boolean(checked),
                  }))
                }
              />
              <span className="text-sm">Require uppercase letter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={passwordComplexity.requireLowercase ?? false}
                onCheckedChange={(checked) =>
                  setPasswordComplexity((prev) => ({
                    ...prev,
                    requireLowercase: Boolean(checked),
                  }))
                }
              />
              <span className="text-sm">Require lowercase letter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={passwordComplexity.requireNumber ?? false}
                onCheckedChange={(checked) =>
                  setPasswordComplexity((prev) => ({
                    ...prev,
                    requireNumber: Boolean(checked),
                  }))
                }
              />
              <span className="text-sm">Require number</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={passwordComplexity.requireSpecial ?? false}
                onCheckedChange={(checked) =>
                  setPasswordComplexity((prev) => ({
                    ...prev,
                    requireSpecial: Boolean(checked),
                  }))
                }
              />
              <span className="text-sm">Require special character</span>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              onClick={async () => {
                setPasswordComplexityMessage(null);
                try {
                  await api.updateTenantSettings({
                    passwordComplexity: {
                      minLength: passwordComplexity.minLength,
                      maxLength: passwordComplexity.maxLength ?? undefined,
                      requireUppercase:
                        passwordComplexity.requireUppercase || undefined,
                      requireLowercase:
                        passwordComplexity.requireLowercase || undefined,
                      requireNumber:
                        passwordComplexity.requireNumber || undefined,
                      requireSpecial:
                        passwordComplexity.requireSpecial || undefined,
                    },
                    passwordExpiryDays:
                      passwordExpiryDays === "" || passwordExpiryDays === null
                        ? null
                        : Number(passwordExpiryDays),
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["tenant-current"],
                  });
                  setPasswordComplexityMessage({
                    type: "success",
                    text: "Password complexity saved.",
                  });
                  setTimeout(() => setPasswordComplexityMessage(null), 4000);
                } catch (err) {
                  setPasswordComplexityMessage({
                    type: "error",
                    text: err instanceof Error ? err.message : "Failed to save",
                  });
                }
              }}
            >
              Save password rules
            </Button>
            {passwordComplexityMessage && (
              <span
                className={
                  passwordComplexityMessage.type === "success"
                    ? "text-sm text-green-600 dark:text-green-400"
                    : "text-sm text-red-600 dark:text-red-400"
                }
              >
                {passwordComplexityMessage.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsSecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Security</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Loading…</p>
          </div>
        </div>
      }
    >
      <SettingsSecurityContent />
    </Suspense>
  );
}
