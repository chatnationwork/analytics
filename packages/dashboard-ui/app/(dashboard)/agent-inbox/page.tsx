"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  RefreshCw,
  CheckCircle,
  ArrowRightLeft,
  Clock,
  Inbox,
  Archive,
  UserX,
  User,
} from "lucide-react";
import { ChatList } from "@/components/agent-inbox/ChatList";
import { ChatWindow } from "@/components/agent-inbox/ChatWindow";
import { MessageInput } from "@/components/agent-inbox/MessageInput";
import { ResolveDialog } from "@/components/agent-inbox/ResolveDialog";
import { TransferDialog } from "@/components/agent-inbox/TransferDialog";
import { ContactProfilePanel } from "@/components/agent-inbox/ContactProfilePanel";
import {
  agentApi,
  InboxSession,
  Message,
  InboxFilter,
  TeamWrapUpReport,
  type SendMessagePayload,
  type AgentInboxCounts,
  type TenantInboxCounts,
} from "@/lib/api/agent";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const FILTER_TABS_AGENT: {
  value: InboxFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All", icon: <Inbox className="h-4 w-4" /> },
  { value: "assigned", label: "Assigned", icon: <Inbox className="h-4 w-4" /> },
  { value: "pending", label: "Active", icon: <Clock className="h-4 w-4" /> },
  {
    value: "resolved",
    label: "Resolved",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  { value: "expired", label: "Expired", icon: <Archive className="h-4 w-4" /> },
];

const FILTER_TABS_SUPER_ADMIN: {
  value: InboxFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All", icon: <Inbox className="h-4 w-4" /> },
  {
    value: "assigned",
    label: "Assigned",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  {
    value: "unassigned",
    label: "Unassigned",
    icon: <UserX className="h-4 w-4" />,
  },
  { value: "pending", label: "Active", icon: <Clock className="h-4 w-4" /> },
  {
    value: "resolved",
    label: "Resolved",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  { value: "expired", label: "Expired", icon: <Archive className="h-4 w-4" /> },
];

export default function AgentInboxPage() {
  const [sessions, setSessions] = useState<InboxSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  /** Sessions the current user has explicitly accepted this browser session. */
  const [acceptedSessions, setAcceptedSessions] = useState<Set<string>>(
    () => new Set(),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [canViewAllChats, setCanViewAllChats] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [resolveWrapUpConfig, setResolveWrapUpConfig] = useState<
    TeamWrapUpReport | null | undefined
  >(undefined);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current user and permissions on mount
  useEffect(() => {
    authClient
      .getProfile()
      .then((u) => {
        setCurrentUserId(u.id);
        setCanViewAllChats(
          u.permissions?.global?.includes("session.view_all") ?? false,
        );
      })
      .catch(console.error);
  }, []);

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentApi.getInbox(filter);
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const { data: inboxCounts } = useQuery({
    queryKey: ["agent-inbox-counts"],
    queryFn: () => agentApi.getInboxCounts(),
  });

  function getCountForFilter(value: InboxFilter): number | null {
    if (!inboxCounts) return null;
    // Tab value "pending" is displayed as "Active"; API returns key "active"
    const countKey =
      value === "pending" ? "active" : (value as keyof AgentInboxCounts);
    if ("all" in inboxCounts && "unassigned" in inboxCounts) {
      const admin = inboxCounts as TenantInboxCounts;
      const k = countKey as keyof TenantInboxCounts;
      return typeof admin[k] === "number" ? (admin[k] as number) : null;
    }
    const agent = inboxCounts as AgentInboxCounts;
    if (value === "all") return agent.assigned + agent.active + agent.expired;
    const k = countKey as keyof AgentInboxCounts;
    return typeof agent[k] === "number" ? (agent[k] as number) : null;
  }

  // Initial fetch and when filter changes
  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  // Poll messages for the open chat so new inbound replies appear without manual refresh
  const MESSAGE_POLL_MS = 4000;
  useEffect(() => {
    if (!selectedSessionId) return;
    const poll = async () => {
      try {
        const data = await agentApi.getSession(selectedSessionId);
        const serverMessages = Array.isArray(data?.messages)
          ? data.messages
          : [];
        setMessages((prev) => {
          const optimistic = prev.filter((m) =>
            String(m.id).startsWith("temp-"),
          );
          if (optimistic.length === 0) return serverMessages;
          return [...serverMessages, ...optimistic];
        });
      } catch {
        // ignore poll errors (e.g. network); next poll will retry
      }
    };
    const interval = setInterval(poll, MESSAGE_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  const handleSelectSession = async (session: InboxSession) => {
    setSelectedSessionId(session.id);
    try {
      const data = await agentApi.getSession(session.id);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);

      // Mark as read locally or refresh session data if needed
      if (session.status === "unassigned") {
        // Auto-accept? Or just show "Accept" button?
        // For now just show.
      }
    } catch (error) {
      console.error("Failed to fetch session details:", error);
    }
  };

  const handleSendMessage = async (payload: string | SendMessagePayload) => {
    if (!selectedSessionId) return;

    const body = typeof payload === "string" ? payload : payload;
    const type = typeof body === "string" ? "text" : (body.type ?? "text");
    const content =
      typeof body === "string"
        ? body
        : (body.content ??
          (body.type === "location" && body.name
            ? body.name
            : `[${body.type}]`));
    const metadata: Record<string, unknown> =
      typeof body === "string" ? {} : {};
    if (typeof body === "object" && body.media_url)
      metadata.media_url = body.media_url;
    if (typeof body === "object" && body.filename)
      metadata.filename = body.filename;
    if (typeof body === "object" && body.latitude != null)
      metadata.latitude = body.latitude;
    if (typeof body === "object" && body.longitude != null)
      metadata.longitude = body.longitude;
    if (typeof body === "object" && body.address)
      metadata.address = body.address;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sessionId: selectedSessionId,
      direction: "outbound",
      type,
      content: typeof content === "string" ? content : "",
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const newMsg = await agentApi.sendMessage(selectedSessionId, payload);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)));
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    }
  };

  const invalidateInboxCounts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agent-inbox-counts"] });
  }, [queryClient]);

  const handleAcceptSession = async (sessionId: string) => {
    try {
      const updated = await agentApi.acceptSession(sessionId);
      toast.success("Chat accepted");
      fetchInbox();
      invalidateInboxCounts();
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...updated } : s)),
      );
      setAcceptedSessions((prev) => {
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept chat";
      toast.error(message);
      // Refresh so list reflects current state (e.g. chat taken by another agent)
      fetchInbox();
      invalidateInboxCounts();
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
  };

  const handleResolveSession = async (data: {
    category?: string;
    notes?: string;
    outcome?: string;
    wrapUpData?: Record<string, string>;
  }) => {
    if (!selectedSessionId) return;

    await agentApi.resolveSession(selectedSessionId, data);
    // Refresh inbox
    fetchInbox();
    invalidateInboxCounts();
    // Update local session status
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedSessionId ? { ...s, status: "resolved" as const } : s,
      ),
    );
  };

  const handleTransferSession = async (
    targetAgentId: string,
    reason?: string,
  ) => {
    if (!selectedSessionId) return;

    await agentApi.transferSession(selectedSessionId, targetAgentId, reason);
    // Refresh inbox - the session will no longer appear in our inbox
    fetchInbox();
    invalidateInboxCounts();
    // Clear selection since it's transferred
    setSelectedSessionId(null);
    setMessages([]);
  };

  // Check if a session is expired (no activity for 24+ hours)
  const isSessionExpired = (session: InboxSession) => {
    if (!session.lastMessageAt) return false;
    const lastMessage = new Date(session.lastMessageAt);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24 && session.status === "assigned";
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const hasAcceptedSelected =
    !!selectedSession &&
    (selectedSession.acceptedAt != null ||
      acceptedSessions.has(selectedSession.id));

  const canSendMessage =
    !!selectedSession &&
    selectedSession.status === "assigned" &&
    hasAcceptedSelected;

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-3 p-4">
      {/* Chat list: fixed width so chat area gets maximum space */}
      <Card className="shrink-0 w-72 sm:w-80 flex flex-col">
        <CardHeader className="space-y-0 pb-2 border-b">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Inbox
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchInbox}>
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg flex-wrap">
            {(canViewAllChats
              ? FILTER_TABS_SUPER_ADMIN
              : FILTER_TABS_AGENT
            ).map((tab) => {
              const count = getCountForFilter(tab.value);
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === tab.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count != null && (
                    <span
                      className={`tabular-nums ${
                        filter === tab.value
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {loading && sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No {filter === "all" ? "" : filter} chats
            </div>
          ) : (
            <ChatList
              sessions={sessions}
              selectedSessionId={selectedSessionId || undefined}
              onSelectSession={handleSelectSession}
              isExpired={isSessionExpired}
            />
          )}
        </CardContent>
      </Card>

      {/* Main: Chat – takes all remaining space; most important area */}
      <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selectedSessionId ? (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 border-b bg-muted/20 gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {selectedSession?.contactName || selectedSession?.contactId}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      selectedSession?.status === "resolved"
                        ? "bg-green-500/10 text-green-500"
                        : selectedSession && isSessionExpired(selectedSession)
                          ? "bg-orange-500/10 text-orange-500"
                          : selectedSession?.status === "assigned"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedSession?.status === "resolved"
                      ? "Resolved"
                      : selectedSession && isSessionExpired(selectedSession)
                        ? "Expired"
                        : selectedSession?.status}
                  </span>
                  <span>•</span>
                  <span>{selectedSession?.channel}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant={showContactPanel ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowContactPanel((v) => !v)}
                  title={
                    showContactPanel
                      ? "Hide contact profile"
                      : "Show contact profile"
                  }
                  aria-label={
                    showContactPanel
                      ? "Hide contact profile"
                      : "Show contact profile"
                  }
                  className="gap-1.5"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Contact</span>
                </Button>
                {selectedSession &&
                  selectedSession.status !== "resolved" &&
                  !hasAcceptedSelected && (
                    <Button
                      size="sm"
                      onClick={() =>
                        selectedSessionId &&
                        handleAcceptSession(selectedSessionId)
                      }
                    >
                      Accept Chat
                    </Button>
                  )}
                {selectedSession?.status === "assigned" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTransferDialog(true)}
                      className="gap-1.5"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer
                    </Button>
                    {hasAcceptedSelected && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (selectedSession?.assignedTeamId) {
                            try {
                              const team = await agentApi.getTeam(
                                selectedSession.assignedTeamId,
                              );
                              setResolveWrapUpConfig(team.wrapUpReport ?? null);
                            } catch {
                              setResolveWrapUpConfig(null);
                            }
                          } else {
                            setResolveWrapUpConfig(null);
                          }
                          setShowResolveDialog(true);
                        }}
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardHeader>

            <ChatWindow messages={messages} currentUserId={currentUserId} />

            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={
                selectedSession?.status === "resolved" || !canSendMessage
              }
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </Card>

      {/* Contact profile: hideable so chat has maximum space by default */}
      {showContactPanel && selectedSession && selectedSession.contactId && (
        <div className="shrink-0 w-72 sm:w-80 flex flex-col overflow-hidden">
          <ContactProfilePanel
            contactId={selectedSession.contactId}
            contactName={selectedSession.contactName}
          />
        </div>
      )}

      {/* Resolve Dialog */}
      <ResolveDialog
        isOpen={showResolveDialog}
        onClose={() => setShowResolveDialog(false)}
        onResolve={handleResolveSession}
        contactName={selectedSession?.contactName || selectedSession?.contactId}
        wrapUpConfig={resolveWrapUpConfig}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        isOpen={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        onTransfer={handleTransferSession}
        contactName={selectedSession?.contactName || selectedSession?.contactId}
      />
    </div>
  );
}
