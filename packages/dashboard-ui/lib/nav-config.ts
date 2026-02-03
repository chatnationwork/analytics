/**
 * Canonical list of sidebar nav entries for default labels and settings.
 * Keyed by href so nav label overrides (tenant.settings.navLabels) can be applied.
 */
export const NAV_ENTRIES: { href: string; defaultLabel: string }[] = [
  { href: "/agent-inbox", defaultLabel: "Inbox" },
  { href: "/contacts", defaultLabel: "Contacts" },
  { href: "/team-management", defaultLabel: "Team Management" },
  { href: "/overview", defaultLabel: "Overview" },
  { href: "/funnel", defaultLabel: "Funnels" },
  { href: "/journey", defaultLabel: "User Journeys" },
  { href: "/journeys", defaultLabel: "Self-Serve vs Assisted" },
  { href: "/whatsapp-analytics", defaultLabel: "WhatsApp" },
  { href: "/whatsapp", defaultLabel: "Campaigns" },
  { href: "/agent-analytics", defaultLabel: "Agent Analytics" },
  { href: "/ai-analytics", defaultLabel: "AI & Intents" },
  { href: "/wrap-up-analytics", defaultLabel: "Wrap-up Reports" },
  { href: "/csat-analytics", defaultLabel: "CSAT" },
  { href: "/events", defaultLabel: "Live Events" },
  { href: "/audit-logs", defaultLabel: "Audit logs" },
  { href: "/settings/api-keys", defaultLabel: "API Keys" },
  { href: "/settings/crm", defaultLabel: "CRM Integrations" },
  { href: "/settings/people", defaultLabel: "Users" },
  { href: "/settings/session", defaultLabel: "Session Management" },
  { href: "/settings/roles", defaultLabel: "Roles & Permissions" },
  { href: "/settings/navigation", defaultLabel: "Navigation labels" },
  { href: "/settings/security", defaultLabel: "Security" },
  { href: "/docs", defaultLabel: "Docs" },
];

export function getDefaultNavLabel(href: string): string {
  const entry = NAV_ENTRIES.find((e) => e.href === href);
  return entry?.defaultLabel ?? href;
}
