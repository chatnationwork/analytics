import { InboxSession } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import { User, MessageSquare } from "lucide-react";

interface ChatListProps {
  sessions: InboxSession[];
  selectedSessionId?: string;
  onSelectSession: (session: InboxSession) => void;
}

export function ChatList({ sessions, selectedSessionId, onSelectSession }: ChatListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No conversations found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelectSession(session)}
          className={cn(
            "flex items-start gap-3 rounded-lg p-3 text-left text-sm transition-all hover:bg-accent",
            selectedSessionId === session.id ? "bg-accent" : "transparent"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 opacity-50" />
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold truncate">
                {session.contactName || session.contactId}
              </span>
              {session.lastMessageAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(session.lastMessageAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
               <span className={cn(
                   "text-xs px-1.5 py-0.5 rounded-full capitalize",
                   session.status === 'assigned' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                   session.status === 'unassigned' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" :
                   "bg-gray-100 text-gray-800"
               )}>
                   {session.status}
               </span>
               <span className="text-xs text-muted-foreground truncate">
                   {session.channel}
               </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
