"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
}

function getMessageBody(msg: Message): string {
  try {
    if (
      msg.content &&
      msg.content.startsWith("{") &&
      msg.content.includes('"body"')
    ) {
      const parsed = JSON.parse(msg.content);
      return parsed.body || msg.content;
    }
  } catch {}
  return msg.content ?? "";
}

function MessageBubbleContent({ msg }: { msg: Message }) {
  const isOutbound = msg.direction === "outbound";
  const meta = msg.metadata ?? {};
  const content = getMessageBody(msg);

  // Text
  if (msg.type === "text" || !msg.type) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {content || "(empty)"}
      </div>
    );
  }

  // Image
  if (msg.type === "image") {
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <ImageIcon className="h-8 w-8 shrink-0 opacity-80" />
          <span className="text-xs truncate">Image</span>
        </div>
        {content && <p className="text-xs opacity-90 mt-0.5">{content}</p>}
      </div>
    );
  }

  // Video
  if (msg.type === "video") {
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <Video className="h-8 w-8 shrink-0 opacity-80" />
          <span className="text-xs truncate">Video</span>
        </div>
        {content && <p className="text-xs opacity-90 mt-0.5">{content}</p>}
      </div>
    );
  }

  // Audio
  if (msg.type === "audio") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
        <Mic className="h-6 w-6 shrink-0 opacity-80" />
        <span className="text-xs">Audio</span>
      </div>
    );
  }

  // Document
  if (msg.type === "document") {
    const fn = (meta.filename as string) || content || "Document";
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <FileText className="h-6 w-6 shrink-0 opacity-80" />
          <span className="text-xs truncate">{fn}</span>
        </div>
        {content && content !== fn && (
          <p className="text-xs opacity-90 mt-0.5">{content}</p>
        )}
      </div>
    );
  }

  // Location
  if (msg.type === "location") {
    const lat = (meta.latitude ?? "") as string;
    const lng = (meta.longitude ?? "") as string;
    const name = content || (meta.name as string) || "Location";
    const addr = (meta.address as string) || "";
    const mapsUrl =
      lat && lng
        ? `https://www.google.com/maps?q=${encodeURIComponent(lat + "," + lng)}`
        : null;

    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-start gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <MapPin className="h-5 w-5 shrink-0 opacity-80 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{name}</p>
            {addr && <p className="text-xs opacity-80 truncate">{addr}</p>}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1 text-xs mt-1",
                  isOutbound
                    ? "text-primary-foreground/90 underline"
                    : "text-primary underline",
                )}
              >
                View on map
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {content || "(empty)"}
    </div>
  );
}

export function ChatWindow({ messages, currentUserId }: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-0">
        No messages yet.
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-4 space-y-4"
    >
      {messages.map((msg) => {
        const isOutbound = msg.direction === "outbound";

        return (
          <div
            key={msg.id}
            className={cn(
              "flex max-w-[85%] w-fit flex-col gap-2 rounded-xl px-3 py-2.5 text-sm shadow-sm min-w-0",
              isOutbound
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            <div className="flex items-start gap-2">
              {!isOutbound && (
                <User className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
              )}
              <div className="flex-1 min-w-0">
                <MessageBubbleContent msg={msg} />
              </div>
              {isOutbound && (
                <Bot className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
              )}
            </div>
            <div
              className={cn(
                "text-[10px] opacity-70 text-right",
                isOutbound
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
