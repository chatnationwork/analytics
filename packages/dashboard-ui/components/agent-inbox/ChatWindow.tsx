import { Message } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string; // The agent's user ID
}

export function ChatWindow({ messages, currentUserId }: ChatWindowProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isOutbound = msg.direction === 'outbound';
        
        return (
          <div
            key={msg.id}
            className={cn(
              "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
              isOutbound
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            <div className="flex items-start gap-2">
                {!isOutbound && <User className="h-4 w-4 mt-0.5 opacity-70" />}
                <div className="flex-1 whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
                {isOutbound && <Bot className="h-4 w-4 mt-0.5 opacity-70" />}
            </div>
            
            <div className={cn(
                "text-[10px] opacity-70 text-right",
                isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
