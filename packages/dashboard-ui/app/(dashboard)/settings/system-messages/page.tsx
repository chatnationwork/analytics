"use client";

import { Suspense, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/auth/PermissionContext";
import { RouteGuard } from "@/components/auth/RouteGuard";

/** Keys and display config for system messages (must match backend SystemMessagesConfig) */
const SYSTEM_MESSAGE_FIELDS: {
  key: keyof SystemMessagesForm;
  label: string;
  description: string;
  multiline: boolean;
}[] = [
  {
    key: "handoverMessage",
    label: "Handover message",
    description:
      "WhatsApp text shown when a user is connected to an agent (e.g. “Connecting you to an agent...”).",
    multiline: false,
  },
  {
    key: "outOfOfficeMessage",
    label: "Out of office message",
    description:
      "Default message when the team schedule is closed (used if the team has no custom message).",
    multiline: false,
  },
  {
    key: "inviteEmailSubject",
    label: "Invite email subject",
    description:
      "Subject line of the email sent when inviting a new user. You can use {{workspaceName}}.",
    multiline: false,
  },
  {
    key: "inviteEmailBody",
    label: "Invite email body",
    description:
      "Main paragraph of the invite email. You can use {{inviterName}} and {{workspaceName}}.",
    multiline: true,
  },
  {
    key: "loginVerifySubject",
    label: "Login verification email subject",
    description: "Subject line of the email sent when a user logs in from a new device or browser.",
    multiline: false,
  },
  {
    key: "loginVerifyBody",
    label: "Login verification email body",
    description:
      "Body text of the login verification email. A “Verify” button is added by the app.",
    multiline: true,
  },
  {
    key: "csatHeader",
    label: "CSAT CTA header",
    description: "Header text of the WhatsApp message sent when a chat is resolved (CSAT).",
    multiline: false,
  },
  {
    key: "csatBody",
    label: "CSAT CTA body",
    description: "Body text of the CSAT WhatsApp message.",
    multiline: true,
  },
  {
    key: "csatFooter",
    label: "CSAT CTA footer",
    description: "Footer text of the CSAT WhatsApp message.",
    multiline: false,
  },
  {
    key: "csatButtonText",
    label: "CSAT CTA button text",
    description: "Label of the button in the CSAT WhatsApp message.",
    multiline: false,
  },
];

/** Default copy (must match backend DEFAULT_SYSTEM_MESSAGES for display) */
const DEFAULT_SYSTEM_MESSAGES: Required<SystemMessagesForm> = {
  handoverMessage: "Connecting you to an agent...",
  outOfOfficeMessage: "We are currently closed.",
  inviteEmailSubject:
    "You've been invited to join {{workspaceName}} on ChatNation",
  inviteEmailBody:
    "{{inviterName}} has invited you to join their workspace on ChatNation. Click the button below to accept the invitation and set up your account.",
  loginVerifySubject: "Verify your login",
  loginVerifyBody:
    "You're trying to log in from a new device or browser. Click the button below to verify it's you and log in there. Your other session will be signed out.",
  csatHeader: "How did we do?",
  csatBody:
    "Your chat has been resolved. We'd love your feedback.",
  csatFooter: "Tap the button below to rate your experience.",
  csatButtonText: "Rate your experience",
};

export type SystemMessagesForm = {
  handoverMessage?: string;
  outOfOfficeMessage?: string;
  inviteEmailSubject?: string;
  inviteEmailBody?: string;
  loginVerifySubject?: string;
  loginVerifyBody?: string;
  csatHeader?: string;
  csatBody?: string;
  csatFooter?: string;
  csatButtonText?: string;
};

function SystemMessagesContent() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const canManage = can("settings.manage");
  const { data: tenant } = useQuery({
    queryKey: ["tenant-current"],
    queryFn: () => api.getCurrentTenant(),
    enabled: canManage,
  });

  const [form, setForm] = useState<SystemMessagesForm>(() => ({
    ...DEFAULT_SYSTEM_MESSAGES,
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const tenantSystemMessages = (tenant?.settings as { systemMessages?: SystemMessagesForm } | undefined)
    ?.systemMessages;

  useEffect(() => {
    if (tenantSystemMessages && typeof tenantSystemMessages === "object") {
      setForm({
        ...DEFAULT_SYSTEM_MESSAGES,
        ...tenantSystemMessages,
      });
    } else {
      setForm({ ...DEFAULT_SYSTEM_MESSAGES });
    }
  }, [tenantSystemMessages]);

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.updateTenantSettings({
        systemMessages: {
          handoverMessage: form.handoverMessage?.trim() || undefined,
          outOfOfficeMessage: form.outOfOfficeMessage?.trim() || undefined,
          inviteEmailSubject: form.inviteEmailSubject?.trim() || undefined,
          inviteEmailBody: form.inviteEmailBody?.trim() || undefined,
          loginVerifySubject: form.loginVerifySubject?.trim() || undefined,
          loginVerifyBody: form.loginVerifyBody?.trim() || undefined,
          csatHeader: form.csatHeader?.trim() || undefined,
          csatBody: form.csatBody?.trim() || undefined,
          csatFooter: form.csatFooter?.trim() || undefined,
          csatButtonText: form.csatButtonText?.trim() || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-current"] });
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      setMessage({ type: "success", text: "System messages saved." });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            System messages
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You don’t have permission to edit system messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          System messages
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure the copy for handover, invite and login emails, out of
          office, and CSAT messages. Leave a field empty to use the default.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        {SYSTEM_MESSAGE_FIELDS.map(({ key, label, description, multiline }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <p className="text-sm text-muted-foreground">{description}</p>
            {multiline ? (
              <textarea
                id={key}
                value={form[key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={DEFAULT_SYSTEM_MESSAGES[key]}
                rows={3}
                className={cn(
                  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono",
                )}
              />
            ) : (
              <Input
                id={key}
                value={form[key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={DEFAULT_SYSTEM_MESSAGES[key]}
                className="font-mono"
              />
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save system messages"}
          </Button>
          {message && (
            <span
              className={
                message.type === "success"
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsSystemMessagesPage() {
  return (
    <RouteGuard permission="settings.manage">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                System messages
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Loading…
              </p>
            </div>
          </div>
        }
      >
        <SystemMessagesContent />
      </Suspense>
    </RouteGuard>
  );
}
