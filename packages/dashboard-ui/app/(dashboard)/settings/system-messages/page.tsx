"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/auth/PermissionContext";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { MessageSquare, Mail, Shield, Star, Clock } from "lucide-react";

export type SystemMessagesForm = {
  handoverMessage?: string;
  outOfOfficeMessage?: string;
  outOfOfficeImage?: string;
  inviteEmailSubject?: string;
  inviteEmailBody?: string;
  loginVerifySubject?: string;
  loginVerifyBody?: string;
  csatHeader?: string;
  csatBody?: string;
  csatFooter?: string;
  csatButtonText?: string;
};

/** Default copy (must match backend DEFAULT_SYSTEM_MESSAGES) */
const DEFAULT_SYSTEM_MESSAGES: Required<SystemMessagesForm> = {
  handoverMessage: "Connecting you to an agent...",
  outOfOfficeMessage: "We are currently closed.",
  outOfOfficeImage: "",
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

/** Variables that can be used in invite email. Shown as insertable chips. */
const INVITE_VARIABLES = [
  {
    placeholder: "{{workspaceName}}",
    label: "Workspace name",
    description: "Your organization name (e.g. Acme Corp)",
    example: "Acme Corp",
  },
  {
    placeholder: "{{inviterName}}",
    label: "Inviter name",
    description: "The person who sent the invite (e.g. Jane Smith)",
    example: "Jane Smith",
  },
] as const;

function substitutePreview(text: string, workspaceName: string, inviterName: string): string {
  return text
    .replace(/\{\{workspaceName\}\}/g, workspaceName)
    .replace(/\{\{inviterName\}\}/g, inviterName);
}

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
  const [uploading, setUploading] = useState(false);
  const lastFocusedInviteRef = useRef<"inviteEmailSubject" | "inviteEmailBody">("inviteEmailBody");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const tenantSystemMessages = (tenant?.settings as { systemMessages?: SystemMessagesForm } | undefined)
    ?.systemMessages;
  const workspaceName = tenant?.name?.trim() || "Your workspace";
  const inviterName = "Jane Smith"; // example for preview

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
          outOfOfficeImage: form.outOfOfficeImage?.trim() || undefined,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/dashboard/media/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, outOfOfficeImage: data.url }));
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to upload image" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, outOfOfficeImage: "" }));
  };

  const insertVariable = useCallback(
    (placeholder: string) => {
      const key = lastFocusedInviteRef.current;
      const el = document.getElementById(key) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      const start = el.selectionStart ?? form[key]?.length ?? 0;
      const end = el.selectionEnd ?? start;
      const current = form[key] ?? "";
      const next = current.slice(0, start) + placeholder + current.slice(end);
      setForm((prev) => ({ ...prev, [key]: next }));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    },
    [form.inviteEmailSubject, form.inviteEmailBody],
  );

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

  const inputClass = cn(
    "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  );
  const textareaClass = cn(inputClass, "min-h-[80px] resize-y");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          System messages
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customise the messages your users and contacts see. Each section
          explains when the message is used and shows a preview. Leave a field
          empty to use the default text.
        </p>
      </div>

      {/* Handover */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Handover message
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Shown in the chat when a customer is connected to an agent (e.g. on
          WhatsApp). Keep it short and reassuring.
        </p>
        <div className="space-y-2">
          <Label htmlFor="handoverMessage">Message text</Label>
          <Input
            id="handoverMessage"
            value={form.handoverMessage ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, handoverMessage: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.handoverMessage}
            className={inputClass}
          />
        </div>
        <PreviewBox title="Preview — what the contact sees">
          <p className="text-sm text-foreground">
            {(form.handoverMessage?.trim() || DEFAULT_SYSTEM_MESSAGES.handoverMessage)}
          </p>
        </PreviewBox>
      </section>

      {/* Out of office */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Out of office message
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Shown when someone messages outside your team’s opening hours (if the
          team doesn’t have its own message). For example: “We’re closed right
          now. We’ll reply during business hours.”
        </p>
        <div className="space-y-2">
          <Label htmlFor="outOfOfficeMessage">Message text</Label>
          <textarea
            id="outOfOfficeMessage"
            value={form.outOfOfficeMessage ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, outOfOfficeMessage: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.outOfOfficeMessage}
            rows={3}
            className={textareaClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="outOfOfficeImage">Image (optional)</Label>
          <div className="flex items-start gap-4">
            {form.outOfOfficeImage ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.outOfOfficeImage}
                  alt="Out of office"
                  className="h-24 w-24 rounded-md object-cover border border-border"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ) : (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
                <span className="text-xs text-muted-foreground">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
            <div className="text-sm text-muted-foreground pt-2">
              <p>Upload an image to send along with your out of office message.</p>
              {uploading && <p className="text-xs text-primary animate-pulse">Uploading...</p>}
            </div>
          </div>
        </div>
        <PreviewBox title="Preview — what the contact sees">
          <div className="space-y-2">
            {form.outOfOfficeImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.outOfOfficeImage}
                alt="Out of office preview"
                className="max-h-48 rounded-md object-cover"
              />
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {(form.outOfOfficeMessage?.trim() || DEFAULT_SYSTEM_MESSAGES.outOfOfficeMessage)}
            </p>
          </div>
        </PreviewBox>
      </section>

      {/* Invite email */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Invite email
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sent when you invite a new user to your workspace. You can use
          placeholders so the email includes your workspace name and the
          inviter’s name — click the buttons below to insert them.
        </p>

        <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Insert a placeholder
          </p>
          <p className="text-xs text-muted-foreground">
            These are replaced when the email is sent. Click to add at the
            cursor.
          </p>
          <div className="flex flex-wrap gap-2">
            {INVITE_VARIABLES.map((v) => (
              <button
                key={v.placeholder}
                type="button"
                onClick={() => insertVariable(v.placeholder)}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-foreground"
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click in the subject or body field below, then click a button above to insert the placeholder there.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
            {INVITE_VARIABLES.map((v) => (
              <li key={v.placeholder}>
                <strong className="text-foreground">{v.label}</strong>: {v.description}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inviteEmailSubject">Email subject</Label>
          <Input
            id="inviteEmailSubject"
            value={form.inviteEmailSubject ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, inviteEmailSubject: e.target.value }))
            }
            onFocus={() => { lastFocusedInviteRef.current = "inviteEmailSubject"; }}
            placeholder={DEFAULT_SYSTEM_MESSAGES.inviteEmailSubject}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inviteEmailBody">Email body (main paragraph)</Label>
          <textarea
            id="inviteEmailBody"
            value={form.inviteEmailBody ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, inviteEmailBody: e.target.value }))
            }
            onFocus={() => { lastFocusedInviteRef.current = "inviteEmailBody"; }}
            placeholder={DEFAULT_SYSTEM_MESSAGES.inviteEmailBody}
            rows={3}
            className={textareaClass}
          />
        </div>
        <PreviewBox title="Preview — how the invite email will look">
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Subject: </span>
              <span className="text-foreground">
                {substitutePreview(
                  form.inviteEmailSubject?.trim() || DEFAULT_SYSTEM_MESSAGES.inviteEmailSubject,
                  workspaceName,
                  inviterName,
                )}
              </span>
            </p>
            <p className="text-foreground">
              {substitutePreview(
                form.inviteEmailBody?.trim() || DEFAULT_SYSTEM_MESSAGES.inviteEmailBody,
                workspaceName,
                inviterName,
              )}
            </p>
            <p className="text-muted-foreground italic">
              [Accept Invitation button and link are added automatically]
            </p>
          </div>
        </PreviewBox>
      </section>

      {/* Login verification */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Login verification email
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sent when a user signs in from a new device or browser (if your
          organisation uses single login). The email includes a “Verify” button
          — you only edit the subject and the short message above the button.
        </p>
        <div className="space-y-2">
          <Label htmlFor="loginVerifySubject">Email subject</Label>
          <Input
            id="loginVerifySubject"
            value={form.loginVerifySubject ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, loginVerifySubject: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.loginVerifySubject}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loginVerifyBody">Message above the Verify button</Label>
          <textarea
            id="loginVerifyBody"
            value={form.loginVerifyBody ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, loginVerifyBody: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.loginVerifyBody}
            rows={3}
            className={textareaClass}
          />
        </div>
        <PreviewBox title="Preview — how the verification email will look">
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Subject: </span>
              <span className="text-foreground">
                {form.loginVerifySubject?.trim() || DEFAULT_SYSTEM_MESSAGES.loginVerifySubject}
              </span>
            </p>
            <p className="text-foreground">
              {form.loginVerifyBody?.trim() || DEFAULT_SYSTEM_MESSAGES.loginVerifyBody}
            </p>
            <p className="text-muted-foreground italic">
              [Verify button is added automatically]
            </p>
          </div>
        </PreviewBox>
      </section>

      {/* CSAT */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            CSAT message (after a chat is resolved)
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sent on WhatsApp when a chat is marked resolved, asking the customer
          to rate their experience. You can set the header, main text, footer,
          and the button label.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="csatHeader">Header</Label>
            <Input
              id="csatHeader"
              value={form.csatHeader ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, csatHeader: e.target.value }))
              }
              placeholder={DEFAULT_SYSTEM_MESSAGES.csatHeader}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csatButtonText">Button text</Label>
            <Input
              id="csatButtonText"
              value={form.csatButtonText ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, csatButtonText: e.target.value }))
              }
              placeholder={DEFAULT_SYSTEM_MESSAGES.csatButtonText}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="csatBody">Main message</Label>
          <textarea
            id="csatBody"
            value={form.csatBody ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, csatBody: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.csatBody}
            rows={2}
            className={textareaClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="csatFooter">Footer (optional)</Label>
          <Input
            id="csatFooter"
            value={form.csatFooter ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, csatFooter: e.target.value }))
            }
            placeholder={DEFAULT_SYSTEM_MESSAGES.csatFooter}
            className={inputClass}
          />
        </div>
        <PreviewBox title="Preview — how it looks on WhatsApp">
          <div className="rounded-lg border border-border bg-muted/30 p-4 max-w-sm space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {form.csatHeader?.trim() || DEFAULT_SYSTEM_MESSAGES.csatHeader}
            </p>
            <p className="text-sm text-foreground">
              {form.csatBody?.trim() || DEFAULT_SYSTEM_MESSAGES.csatBody}
            </p>
            {((form.csatFooter ?? "").trim() || DEFAULT_SYSTEM_MESSAGES.csatFooter) && (
              <p className="text-xs text-muted-foreground">
                {form.csatFooter?.trim() || DEFAULT_SYSTEM_MESSAGES.csatFooter}
              </p>
            )}
            <div className="pt-2">
              <span className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                {form.csatButtonText?.trim() || DEFAULT_SYSTEM_MESSAGES.csatButtonText}
              </span>
            </div>
          </div>
        </PreviewBox>
      </section>

      {/* Save */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save all changes"}
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
  );
}

function PreviewBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
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
