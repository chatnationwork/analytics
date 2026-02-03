"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsSecurityPage() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => api.get2FaStatus(),
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (status) {
      setTwoFactorEnabled(status.twoFactorEnabled);
      setPhone("");
    }
  }, [status]);

  const update2Fa = useMutation({
    mutationFn: (body: { twoFactorEnabled?: boolean; phone?: string }) =>
      api.update2Fa(body),
    onSuccess: (data) => {
      queryClient.setQueryData(["2fa-status"], data);
      setTwoFactorEnabled(data.twoFactorEnabled);
      setMessage({ type: "success", text: "Security settings saved." });
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      if (enabled) {
        const digits = phone.replace(/\D/g, "").trim();
        if (digits.length < 10) {
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

  const handleSavePhone = async () => {
    const digits = phone.replace(/\D/g, "").trim();
    if (digits.length < 10) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Two-factor authentication (2FA) via WhatsApp
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="2fa-toggle" className="text-base font-medium">
              Two-factor authentication
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              When enabled, you will receive a 6-digit code on WhatsApp at
              login. Use the first number in your organisation&apos;s CRM for
              sending.
            </p>
          </div>
          <Switch
            id="2fa-toggle"
            checked={twoFactorEnabled}
            onCheckedChange={handleToggle}
            disabled={saving || update2Fa.isPending}
          />
        </div>

        {twoFactorEnabled && (
          <div className="space-y-2 pt-4 border-t border-border">
            <Label htmlFor="2fa-phone">WhatsApp phone number</Label>
            <p className="text-sm text-muted-foreground">
              Digits only (e.g. 254712345678). Code will be sent to this number.
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
              <Button
                type="button"
                onClick={handleSavePhone}
                disabled={saving || update2Fa.isPending}
              >
                Save
              </Button>
            </div>
            {status?.phone && (
              <p className="text-sm text-muted-foreground">
                Current number: {status.phone}
              </p>
            )}
          </div>
        )}

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
    </div>
  );
}
