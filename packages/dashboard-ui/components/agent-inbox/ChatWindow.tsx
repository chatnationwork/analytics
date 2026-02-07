"use client";

import { useMemo, useEffect, useRef } from "react";
import {
  Message,
  type InboxSession,
  type SessionTransfer,
} from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Headset,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  MapPin,
  ExternalLink,
  ArrowRightLeft,
  UserPlus,
} from "lucide-react";

/** One item in the chat timeline: a message or a system event (transfer / new conversation). */
export type ChatTimelineItem =
  | { kind: "message"; message: Message }
  | {
      kind: "transfer";
      at: string;
      from?: string;
      to?: string;
      reason?: string;
    }
  | { kind: "new_conversation"; at: string; sessionId: string };

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  /** Session with context.transfers; used to show "Chat transferred" in history. */
  session?: InboxSession | null;
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

function getMediaUrl(meta: Record<string, unknown>): string | null {
  const url = meta.media_url;
  if (typeof url === "string" && url.trim()) return url;
  return null;
}

function MessageBubbleContent({ msg }: { msg: Message }) {
  const isOutbound = msg.direction === "outbound";
  const meta = msg.metadata ?? {};
  const content = getMessageBody(msg);
  const mediaUrl = getMediaUrl(meta);

  // Text
  if (msg.type === "text" || !msg.type) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {content || "(empty)"}
      </div>
    );
  }

  // Image — show thumbnail when we have a URL
  if (msg.type === "image") {
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        {mediaUrl ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md overflow-hidden border border-black/10 dark:border-white/10 max-w-[280px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            <img
              src={mediaUrl}
              alt={content || "Image"}
              className="max-h-64 w-full object-contain bg-black/5 dark:bg-white/5"
            />
          </a>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
            <ImageIcon className="h-8 w-8 shrink-0 opacity-80" />
            <span className="text-xs truncate">Image</span>
          </div>
        )}
        {content && <p className="text-xs opacity-90 mt-0.5">{content}</p>}
      </div>
    );
  }

  // Video — show preview or link
  if (msg.type === "video") {
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        {mediaUrl ? (
          <div className="rounded-md overflow-hidden border border-black/10 dark:border-white/10 max-w-[280px] bg-black/5 dark:bg-white/5">
            <video
              src={mediaUrl}
              controls
              preload="metadata"
              className="max-h-64 w-full"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
            <Video className="h-8 w-8 shrink-0 opacity-80" />
            <span className="text-xs truncate">Video</span>
          </div>
        )}
        {content && <p className="text-xs opacity-90 mt-0.5">{content}</p>}
      </div>
    );
  }

  // Audio — inline player when we have a URL
  if (msg.type === "audio") {
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <Mic className="h-6 w-6 shrink-0 opacity-80" />
          {mediaUrl ? (
            <audio
              src={mediaUrl}
              controls
              className="max-w-full h-8 min-w-[180px]"
            />
          ) : (
            <span className="text-xs">Audio</span>
          )}
        </div>
      </div>
    );
  }

  // Document — filename + download link when we have a URL
  if (msg.type === "document") {
    const fn = (meta.filename as string) || content || "Document";
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 rounded-md bg-black/10 dark:bg-white/10 p-2">
          <FileText className="h-6 w-6 shrink-0 opacity-80" />
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-xs truncate">{fn}</span>
            {mediaUrl && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-xs underline",
                  isOutbound ? "text-primary-foreground/90" : "text-primary",
                )}
              >
                Open
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
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

function buildTimeline(
  messages: Message[],
  session: InboxSession | null | undefined,
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];

  for (const msg of messages) {
    items.push({ kind: "message", message: msg });
  }

  const transfers = (
    session?.context as { transfers?: SessionTransfer[] } | undefined
  )?.transfers;
  if (Array.isArray(transfers)) {
    for (const t of transfers) {
      const at =
        typeof t.timestamp === "string"
          ? t.timestamp
          : new Date().toISOString();
      items.push({
        kind: "transfer",
        at,
        from: t.from,
        to: t.to,
        reason: t.reason,
      });
    }
  }

  if (messages.length > 0 && messages.some((m) => m.sessionId != null)) {
    const bySession = new Map<string, Message[]>();
    for (const m of messages) {
      const sid = m.sessionId ?? "";
      if (!bySession.has(sid)) bySession.set(sid, []);
      bySession.get(sid)!.push(m);
    }
    const sessionIdsByFirstMessage = [...bySession.entries()]
      .map(([sid, msgs]) => ({
        sessionId: sid,
        firstAt: msgs.reduce(
          (min, m) => (m.createdAt < min ? m.createdAt : min),
          msgs[0].createdAt,
        ),
      }))
      .sort((a, b) => (a.firstAt < b.firstAt ? -1 : 1));
    for (let i = 1; i < sessionIdsByFirstMessage.length; i++) {
      const { sessionId, firstAt } = sessionIdsByFirstMessage[i];
      items.push({ kind: "new_conversation", at: firstAt, sessionId });
    }
  }

  items.sort((a, b) => {
    const timeA = a.kind === "message" ? a.message.createdAt : a.at;
    const timeB = b.kind === "message" ? b.message.createdAt : b.at;
    return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
  });

  return items;
}

function formatTimelineTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatWindow({
  messages,
  currentUserId,
  session,
}: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeline = useMemo(
    () => buildTimeline(messages, session),
    [messages, session],
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (timeline.length === 0) {
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
      {timeline.map((item, index) => {
        if (item.kind === "transfer") {
          return (
            <div
              key={`transfer-${item.at}-${index}`}
              className="flex items-center justify-center gap-2 py-2"
            >
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Chat transferred
                {item.reason && item.reason !== "takeover"
                  ? ` (${item.reason})`
                  : ""}
              </span>
              <span className="text-[10px] text-muted-foreground/80">
                {formatTimelineTime(item.at)}
              </span>
            </div>
          );
        }
        if (item.kind === "new_conversation") {
          return (
            <div
              key={`new-${item.sessionId}-${item.at}-${index}`}
              className="flex items-center justify-center gap-2 py-2"
            >
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Contact returned for a new interaction
              </span>
              <span className="text-[10px] text-muted-foreground/80">
                {formatTimelineTime(item.at)}
              </span>
            </div>
          );
        }
        const msg = item.message;
        const isOutbound = msg.direction === "outbound";
        /** Outbound with senderId = sent by agent from this platform; otherwise bot/automated. */
        const isAgentMessage =
          isOutbound &&
          msg.senderId != null &&
          String(msg.senderId).trim() !== "";
        const OutboundIcon = isAgentMessage ? Headset : Bot;
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
                <span title={isAgentMessage ? "Agent" : "Bot"}>
                  <OutboundIcon
                    className="h-4 w-4 mt-0.5 shrink-0 opacity-70"
                    aria-label={isAgentMessage ? "Agent" : "Bot"}
                  />
                </span>
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
              {formatTimelineTime(msg.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
