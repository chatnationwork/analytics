import { SystemMessagesConfig } from "@lib/database";

/**
 * Default copy for system-sent messages. Used when tenant.settings.systemMessages does not override.
 */
export const DEFAULT_SYSTEM_MESSAGES: Required<SystemMessagesConfig> = {
  handoverMessage: "Connecting you to an agent...",
  outOfOfficeMessage: "We are currently closed.",
  inviteEmailSubject: "You've been invited to join {{workspaceName}} on ChatNation",
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

export function getSystemMessage<K extends keyof SystemMessagesConfig>(
  tenantSettings: { systemMessages?: SystemMessagesConfig } | null,
  key: K,
): string {
  const value = tenantSettings?.systemMessages?.[key];
  if (value != null && typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return DEFAULT_SYSTEM_MESSAGES[key];
}
