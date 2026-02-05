import { InboxSession } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import {
  User,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface ChatListProps {
  sessions: InboxSession[];
  selectedSessionId?: string;
  onSelectSession: (session: InboxSession) => void;
  isExpired?: (session: InboxSession) => boolean;
}

export function ChatList({
  sessions,
  selectedSessionId,
  onSelectSession,
  isExpired,
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
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    if (session.status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500">
          <MessageSquare className="h-3 w-3" />
          Active
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col space-y-1 p-2">
      {sessions.map((session) => {
        const expired = isExpired?.(session);

        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session)}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 text-left text-sm transition-all hover:bg-accent",
              selectedSessionId === session.id ? "bg-accent" : "transparent",
              expired && "border-l-2 border-orange-500",
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
                <span className="font-semibold truncate text-sm">
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
        );
      })}
    </div>
  );
}
