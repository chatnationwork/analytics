/**
 * Supervisor Guide documentation page.
 * Covers team management, queue operations, agent analytics, agent logs,
 * bulk actions, and wrap-up reports.
 * Gated by the docs.supervisor permission via PermissionGuard.
 */
"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BarChart2,
  List,
  ArrowRightLeft,
  FileText,
  Activity,
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

/** Content visible only to users with docs.supervisor permission */
function SupervisorGuideContent() {
  return (
    <div>
      <Link
        href="/guides"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">
        Supervisor Guide
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage teams, monitor agent performance, and keep queues under control.
      </p>

      {/* Team Management */}
      <Section
        title="Team Management"
        icon={<Users className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Navigate to <strong>Team Management</strong> in the sidebar. Here you
          can create teams, add or remove agents, and configure queue
          assignments.
        </p>
        <h3 className="font-medium text-foreground mb-3">Creating a Team</h3>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
          <li>Click <strong>Create Team</strong>.</li>
          <li>
            Enter a name and optional description (e.g. &quot;Tax Filing
            Support&quot;).
          </li>
          <li>Add agents from the available list.</li>
          <li>Save — the team is now ready to receive queue assignments.</li>
        </ol>
        <h3 className="font-medium text-foreground mb-3">
          Queue Assignment Modes
        </h3>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Round Robin</strong> — Distribute chats evenly across
            available agents.
          </li>
          <li>
            <strong>Manual</strong> — Agents pick from the queue themselves.
          </li>
          <li>
            <strong>Assign to Specific Agents</strong> — Route to named agents
            within the team.
          </li>
        </ul>
      </Section>

      {/* Queue Stats */}
      <Section
        title="Queue Stats & Monitoring"
        icon={<Activity className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          The Team Management page shows live queue statistics for each team:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Queue Size</strong> — Number of chats waiting to be
            assigned.
          </li>
          <li>
            <strong>Active Chats</strong> — Chats currently being handled by
            agents.
          </li>
          <li>
            <strong>Avg Wait Time</strong> — How long chats sit in the queue
            before being accepted.
          </li>
          <li>
            <strong>Avg Resolution Time</strong> — Time from acceptance to
            resolution.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Use these metrics to spot backlogs and redistribute work before wait
          times grow.
        </p>
      </Section>

      {/* Bulk Actions */}
      <Section
        title="Bulk Transfer & Re-engagement"
        icon={<ArrowRightLeft className="w-5 h-5" />}
      >
        <h3 className="font-medium text-foreground mb-3">Bulk Transfer</h3>
        <p className="text-muted-foreground mb-4">
          Select multiple chats from a queue and transfer them to another team
          or agent. Useful when a team is overloaded or going off-shift.
        </p>
        <h3 className="font-medium text-foreground mb-3">
          Mass Re-engagement
        </h3>
        <p className="text-muted-foreground">
          For expired conversations, use <strong>Mass Re-engage</strong> to send
          a template message to all inactive contacts in the team at once,
          instead of opening each one individually.
        </p>
      </Section>

      {/* Agent Analytics */}
      <Section
        title="Agent Analytics"
        icon={<BarChart2 className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Navigate to <strong>Agent Analytics</strong> in the sidebar to see
          aggregate performance across your team:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Chats Handled</strong> — Volume per agent or team.
          </li>
          <li>
            <strong>Resolution Time</strong> — Average time to close a chat.
          </li>
          <li>
            <strong>Response Time</strong> — How quickly agents reply.
          </li>
          <li>
            <strong>Comparison</strong> — Compare agents side-by-side.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Use these metrics for training, recognition, SLA monitoring, and
          staffing decisions.
        </p>
      </Section>

      {/* Agent Logs */}
      <Section
        title="Agent Logs"
        icon={<List className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Agent Logs show a timeline of agent activity:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>When each agent came online / went offline.</li>
          <li>Which sessions were assigned, accepted, and resolved.</li>
          <li>Status changes (Available → Busy → Unavailable).</li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Useful for answering &quot;Who handled this case?&quot; and spotting
          scheduling mismatches (e.g. peak hours without coverage).
        </p>
      </Section>

      {/* Wrap-up Reports */}
      <Section
        title="Wrap-up Reports"
        icon={<FileText className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Navigate to <strong>Wrap-up Reports</strong> to analyse resolution
          data:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Category breakdown</strong> — What types of issues are
            agents resolving?
          </li>
          <li>
            <strong>Outcome distribution</strong> — Resolved, referred,
            escalated?
          </li>
          <li>
            <strong>Filter by team and period</strong> — Compare performance
            across teams.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4">
          These reports help identify recurring issues, training needs, and
          opportunities for process improvement.
        </p>
      </Section>
    </div>
  );
}

export default function SupervisorGuidePage() {
  return (
    <PermissionGuard
      permission="docs.supervisor"
      fallback={
        <div className="text-center py-16 text-muted-foreground">
          You do not have permission to view this guide.
        </div>
      }
    >
      <SupervisorGuideContent />
    </PermissionGuard>
  );
}
