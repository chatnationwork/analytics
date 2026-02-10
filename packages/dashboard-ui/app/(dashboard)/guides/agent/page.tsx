/**
 * Agent Guide documentation page.
 * Covers inbox navigation, handling chats, transfers, wrap-up, CSAT,
 * re-engagement, and the contact profile panel.
 * Gated by the docs.agent permission via PermissionGuard.
 */
"use client";

import Link from "next/link";
import { ArrowLeft, Inbox, MessageCircle, CheckCircle, RefreshCw, Star, User } from "lucide-react";
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
        <span className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</span>
        {title}
      </h2>
      <div className="bg-card rounded-xl border border-border p-6">{children}</div>
    </section>
  );
}

/** Content visible only to users with docs.agent permission */
function AgentGuideContent() {
  return (
    <div>
      <Link
        href="/guides"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">Agent Guide</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Everything you need to handle conversations, resolve cases, and support
        taxpayers effectively.
      </p>

      {/* Inbox Overview */}
      <Section title="Inbox Overview" icon={<Inbox className="w-5 h-5" />}>
        <p className="text-muted-foreground mb-4">
          The Inbox is your primary workspace. All conversations from WhatsApp
          and other channels appear here.
        </p>
        <h3 className="font-medium text-foreground mb-3">Filters</h3>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
          <li>
            <strong>All</strong> — Every conversation assigned to you or your
            team.
          </li>
          <li>
            <strong>Assigned</strong> — Conversations explicitly assigned to
            you.
          </li>
          <li>
            <strong>Active</strong> — Conversations you have accepted and are
            working on.
          </li>
          <li>
            <strong>Resolved</strong> — Conversations you have closed with a
            wrap-up.
          </li>
          <li>
            <strong>Expired</strong> — Inactive conversations that timed out
            (you can re-engage).
          </li>
        </ul>
        <h3 className="font-medium text-foreground mb-3">Status Bar</h3>
        <p className="text-muted-foreground">
          Use the status dropdown in the top-right to set yourself as{" "}
          <strong>Available</strong>, <strong>Busy</strong>, or{" "}
          <strong>Unavailable</strong>. New chats are only routed to you when
          you are Available.
        </p>
      </Section>

      {/* Accepting & Resolving */}
      <Section
        title="Accepting & Resolving Chats"
        icon={<CheckCircle className="w-5 h-5" />}
      >
        <h3 className="font-medium text-foreground mb-3">Accept a Chat</h3>
        <p className="text-muted-foreground mb-4">
          When a new conversation is assigned to you, click <strong>Accept</strong>{" "}
          to take ownership. The chat moves from &quot;Assigned&quot; to
          &quot;Active&quot;.
        </p>

        <h3 className="font-medium text-foreground mb-3">Send Messages</h3>
        <p className="text-muted-foreground mb-4">
          Type your reply in the message box. You can send text, media files,
          and location pins. Press <strong>Enter</strong> or click the send
          button.
        </p>

        <h3 className="font-medium text-foreground mb-3">Resolve a Chat</h3>
        <p className="text-muted-foreground">
          Click <strong>Resolve</strong> when the conversation is complete. You
          will be prompted to fill in a wrap-up form (category, outcome, and
          optional notes). This data feeds into Wrap-up Reports and CSAT.
        </p>
      </Section>

      {/* Transfers */}
      <Section
        title="Transfers"
        icon={<RefreshCw className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          If a conversation needs to go to another agent or team, use the{" "}
          <strong>Transfer</strong> button.
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Transfer to Agent</strong> — Pick a specific colleague.
          </li>
          <li>
            <strong>Transfer to Team</strong> — Move the chat to another team's
            queue (e.g. escalation).
          </li>
          <li>
            Add an optional <strong>transfer reason</strong> so the next handler
            has context.
          </li>
        </ul>
      </Section>

      {/* Re-engagement */}
      <Section
        title="Re-engagement"
        icon={<MessageCircle className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          Expired chats are conversations where the taxpayer stopped responding.
          Instead of leaving them unresolved:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Go to the <strong>Expired</strong> filter in your Inbox.</li>
          <li>Open the conversation and click <strong>Re-engage</strong>.</li>
          <li>
            A template message is sent to the taxpayer to restart the
            conversation.
          </li>
        </ol>
      </Section>

      {/* CSAT */}
      <Section
        title="Customer Satisfaction (CSAT)"
        icon={<Star className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          After you resolve a chat, the taxpayer may receive a CSAT survey. Your
          CSAT scores are visible in the CSAT Analytics page.
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            Scores are on a 1–5 scale (1 = very dissatisfied, 5 = very
            satisfied).
          </li>
          <li>
            High scores can be linked to your profile for recognition.
          </li>
          <li>
            A good wrap-up and clear resolution message improve CSAT.
          </li>
        </ul>
      </Section>

      {/* Contact Profile */}
      <Section
        title="Contact Profile"
        icon={<User className="w-5 h-5" />}
      >
        <p className="text-muted-foreground mb-4">
          When handling a chat, the right panel shows the contact profile:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>Name and phone number</strong> — Identified from WhatsApp
            or previous sessions.
          </li>
          <li>
            <strong>Message count and last seen</strong> — How active this
            taxpayer has been.
          </li>
          <li>
            <strong>Notes</strong> — Add internal notes for future agents.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4">
          Use the profile to personalise your response and avoid asking the
          taxpayer to repeat information.
        </p>
      </Section>
    </div>
  );
}

export default function AgentGuidePage() {
  return (
    <PermissionGuard
      permission="docs.agent"
      fallback={
        <div className="text-center py-16 text-muted-foreground">
          You do not have permission to view this guide.
        </div>
      }
    >
      <AgentGuideContent />
    </PermissionGuard>
  );
}
