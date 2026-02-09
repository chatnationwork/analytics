import { InboxSession } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import {
  User,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Circle,
} from "lucide-react";

interface ChatListProps {
  sessions: InboxSession[];
  selectedSessionId?: string;
  onSelectSession: (session: InboxSession) => void;
  isExpired?: (session: InboxSession) => boolean;
  /** When true, show checkboxes for bulk transfer (non-resolved only). */
  canBulkTransfer?: boolean;
  bulkSelectedIds?: Set<string>;
  onBulkToggle?: (sessionId: string) => void;
}

export function ChatList({
  sessions,
  selectedSessionId,
  onSelectSession,
  isExpired,
  canBulkTransfer = false,
  bulkSelectedIds,
  onBulkToggle,
}: ChatListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No conversations found</p>
      </div>
    );
  }

  const getStatusBadge = (session: InboxSession) => {
    if (session.status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500">
          <CheckCircle className="h-3 w-3" />
          Resolved
        </span>
      );
    }
    if (isExpired?.(session)) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-500">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </span>
      );
    }
    if (session.status === "assigned") {
      const isActive = Boolean(session.acceptedAt);
      return isActive ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500">
          <MessageSquare className="h-3 w-3" />
          Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    return null;
  };

  const hasUnread = (session: InboxSession): boolean => {
    if (session.status === "resolved") return false;
    const lastInbound = session.lastInboundMessageAt
      ? new Date(session.lastInboundMessageAt).getTime()
      : 0;
    if (lastInbound === 0) return false;
    const lastRead = session.lastReadAt
      ? new Date(session.lastReadAt).getTime()
      : 0;
    return lastInbound > lastRead;
  };

  return (
    <div className="flex flex-col space-y-1 p-2">
      {sessions.map((session) => {
        const expired = isExpired?.(session);
        const unread = hasUnread(session);
        const canSelectBulk =
          canBulkTransfer &&
          session.status !== "resolved" &&
          onBulkToggle &&
          bulkSelectedIds !== undefined;
        const isBulkSelected = canSelectBulk && bulkSelectedIds.has(session.id);

        return (
          <div
            key={session.id}
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm transition-all",
              selectedSessionId === session.id ? "bg-accent" : "transparent",
              expired && "border-l-2 border-orange-500",
              unread && "border-l-2 border-primary",
            )}
          >
            {canSelectBulk && (
              <label className="shrink-0 p-2 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBulkSelected}
                  onChange={() => onBulkToggle(session.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={
                    isBulkSelected
                      ? "Deselect for bulk transfer"
                      : "Select for bulk transfer"
                  }
                  className="h-4 w-4 rounded border-input"
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => onSelectSession(session)}
              className={cn(
                "flex items-start gap-3 flex-1 rounded-lg p-3 text-left transition-all hover:bg-accent min-w-0",
                !canSelectBulk && "rounded-l-lg",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  session.status === "resolved"
                    ? "bg-green-500/10"
                    : expired
                      ? "bg-orange-500/10"
                      : "bg-muted",
                )}
              >
                <User
                  className={cn(
                    "h-5 w-5",
                    session.status === "resolved"
                      ? "text-green-500"
                      : expired
                        ? "text-orange-500"
                        : "opacity-50",
                  )}
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate text-sm flex items-center gap-1.5">
                    {unread && (
                      <Circle
                        className="h-2 w-2 shrink-0 fill-primary text-primary"
                        aria-label="Unread"
                      />
                    )}
                    {session.contactName?.trim() ||
                      session.contactId ||
                      "Unknown User"}
                  </span>
                  {session.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(session.lastMessageAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {session.contactId}
                    </span>
                    {getStatusBadge(session)}
                  </div>
                  <span className="text-xs text-foreground/80 truncate font-medium">
                    {((session.context as Record<string, unknown>)
                      ?.issue as string) ||
                      ((session.context as Record<string, unknown>)
                        ?.subject as string) ||
                      "General Inquiry"}
                  </span>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
