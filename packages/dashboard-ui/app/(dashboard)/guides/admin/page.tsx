/**
 * Admin Guide documentation page.
 * Covers settings (API keys, CRM, users, roles, session, security),
 * audit logs, campaigns, and system messages.
 * Gated by the docs.admin permission via PermissionGuard.
 */
"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Building2,
  UserCircle,
  Shield,
  ShieldCheck,
  Briefcase,
  MessageCircle,
  Clock,
} from "lucide-react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

/** Reusable section wrapper for consistent styling */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
        <span className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <div className="bg-card rounded-xl border border-border p-6">
        {children}
      </div>
    </section>
  );
}

/** Content visible only to users with docs.admin permission */
function AdminGuideContent() {
  return (
    <div>
      <Link
        href="/guides"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">Admin Guide</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Configure the platform, manage users and roles, and maintain compliance.
      </p>

      {/* API Keys */}
      <Section title="API Keys" icon={<Key className="w-5 h-5" />}>
        <p className="text-muted-foreground mb-4">
          Go to{" "}
          <Link
            href="/settings/api-keys"
            className="text-primary hover:underline"
          >
            Settings → API Keys
          </Link>{" "}
          to manage integration credentials.
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Write Keys</strong> — Used by apps (SDK, backend) to send
            events.
          </li>
          <li>
            <strong>Read Keys</strong> — Used to query analytics data via the
            API.
          </li>
          <li>
            Keys are shown only once on creation — copy and store securely.
          </li>
          <li>Revoke keys immediately if they are compromised.</li>
        </ul>
      </Section>

      {/* CRM Integration */}
      <Section
        title="CRM Integrations"
        icon={<Building2 className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Connect the platform to your CRM to sync contacts and messaging.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>
            Go to{" "}
            <Link
              href="/settings/crm"
              className="text-primary hover:underline"
            >
              Settings → CRM Integrations
            </Link>
            .
          </li>
          <li>Enter the CRM base URL and API credentials.</li>
          <li>Test the connection — a green indicator confirms success.</li>
          <li>
            Once connected, contacts and WhatsApp messages sync automatically.
          </li>
        </ol>
      </Section>

      {/* User Management */}
      <Section
        title="User Management"
        icon={<UserCircle className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Manage platform access via{" "}
          <Link
            href="/settings/people"
            className="text-primary hover:underline"
          >
            Settings → Users
          </Link>
          .
        </p>
        <h3 className="font-medium text-foreground mb-3">Inviting Users</h3>
        <p className="text-muted-foreground mb-4">
          Click <strong>Invite User</strong>, enter their email, and choose a
          role. They will receive an email with a login link.
        </p>
        <h3 className="font-medium text-foreground mb-3">Offboarding</h3>
        <p className="text-muted-foreground">
          Deactivate a user when they leave the organisation. Their sessions
          will be revoked and they will lose access immediately.
        </p>
      </Section>

      {/* Roles & Permissions */}
      <Section
        title="Roles & Permissions"
        icon={<Shield className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Control what each user can see and do via{" "}
          <Link
            href="/settings/roles"
            className="text-primary hover:underline"
          >
            Settings → Roles &amp; Permissions
          </Link>
          .
        </p>
        <h3 className="font-medium text-foreground mb-3">System Roles</h3>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
          <li>
            <strong>Super Admin</strong> — Full access to everything.
          </li>
          <li>
            <strong>Admin</strong> — Settings, user management, analytics, and
            team oversight.
          </li>
          <li>
            <strong>Auditor</strong> — Read-only access to analytics and audit
            logs.
          </li>
          <li>
            <strong>Member</strong> — Base agent access (inbox, assigned chats).
          </li>
        </ul>
        <h3 className="font-medium text-foreground mb-3">Best Practices</h3>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Apply the principle of least privilege — assign the minimum role needed.</li>
          <li>Review role assignments quarterly.</li>
          <li>
            Use the Auditor role for compliance officers who only need to view
            data.
          </li>
        </ul>
      </Section>

      {/* Session Management */}
      <Section
        title="Session Management"
        icon={<Clock className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Configure login session policies via{" "}
          <Link
            href="/settings/session"
            className="text-primary hover:underline"
          >
            Settings → Session Management
          </Link>
          .
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Session Duration</strong> — How long a login session lasts
            before requiring re-authentication.
          </li>
          <li>
            <strong>Inactivity Timeout</strong> — Automatically log out idle
            users to protect taxpayer data.
          </li>
          <li>
            <strong>Revoke All Sessions</strong> — Force all users to re-login.
            Use during security incidents.
          </li>
        </ul>
      </Section>

      {/* Audit Logs */}
      <Section
        title="Audit Logs"
        icon={<ShieldCheck className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Navigate to <strong>Audit Logs</strong> in the Analytics sidebar to
          review all sensitive actions:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Login attempts (successful and failed).</li>
          <li>Role and permission changes.</li>
          <li>Settings modifications (API keys, CRM, security).</li>
          <li>Data access and exports.</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Filter by user, action type, and date range. Export logs for external
          compliance reviews.
        </p>
      </Section>

      {/* Campaigns */}
      <Section
        title="Campaigns"
        icon={<Briefcase className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Navigate to <strong>Campaigns</strong> in the Analytics sidebar to
          create and manage outbound messaging:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Create</strong> — Define target audience, message template,
            and schedule.
          </li>
          <li>
            <strong>Clone</strong> — Duplicate a successful campaign and adjust
            targeting.
          </li>
          <li>
            <strong>Reports</strong> — View delivery, read, and reply rates per
            campaign.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Combine campaign reports with Overview and Funnels to understand what
          drove conversions.
        </p>
      </Section>

      {/* System Messages */}
      <Section
        title="System Messages & Labels"
        icon={<MessageCircle className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Customise platform copy and branding:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <Link
              href="/settings/navigation"
              className="text-primary hover:underline"
            >
              Navigation Labels
            </Link>{" "}
            — Rename sidebar items to match organisational language (e.g.
            &quot;Inbox&quot; → &quot;Support Queue&quot;).
          </li>
          <li>
            <Link
              href="/settings/system-messages"
              className="text-primary hover:underline"
            >
              System Messages
            </Link>{" "}
            — Control in-app messages (session expiry warnings, error messages).
          </li>
        </ul>
      </Section>
    </div>
  );
}

export default function AdminGuidePage() {
  return (
    <PermissionGuard
      permission="docs.admin"
      fallback={
        <div className="text-center py-16 text-muted-foreground">
          You do not have permission to view this guide.
        </div>
      }
    >
      <AdminGuideContent />
    </PermissionGuard>
  );
}
