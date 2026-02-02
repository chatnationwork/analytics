"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { ChatList } from "@/components/agent-inbox/ChatList";
import { ChatWindow } from "@/components/agent-inbox/ChatWindow";
import { MessageInput } from "@/components/agent-inbox/MessageInput";
import { ResolveDialog } from "@/components/agent-inbox/ResolveDialog";
import { TransferDialog } from "@/components/agent-inbox/TransferDialog";
import {
  agentApi,
  InboxSession,
  Message,
  InboxFilter,
  TeamWrapUpReport,
} from "@/lib/api/agent";
import { authClient } from "@/lib/auth-client";

const FILTER_TABS: {
  value: InboxFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All", icon: <Inbox className="h-4 w-4" /> },
  { value: "pending", label: "Pending", icon: <Clock className="h-4 w-4" /> },
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [resolveWrapUpConfig, setResolveWrapUpConfig] = useState<
    TeamWrapUpReport | null | undefined
  >(undefined);

  // Fetch current user ID on mount
  useEffect(() => {
    const user = authClient
      .getProfile()
      .then((u) => setCurrentUserId(u.id))
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

  // Initial fetch and when filter changes
  useEffect(() => {
    fetchInbox();
    // Poll every 10 seconds
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  const handleSelectSession = async (session: InboxSession) => {
    setSelectedSessionId(session.id);
    try {
      const data = await agentApi.getSession(session.id);
      setMessages(data.messages);

      // Mark as read locally or refresh session data if needed
      if (session.status === "unassigned") {
        // Auto-accept? Or just show "Accept" button?
        // For now just show.
      }
    } catch (error) {
      console.error("Failed to fetch session details:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedSessionId) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisiticMsg: Message = {
      id: tempId,
      sessionId: selectedSessionId,
      direction: "outbound",
      type: "text",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisiticMsg]);

    try {
      const newMsg = await agentApi.sendMessage(selectedSessionId, content);
      // Replace optimistic message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)));
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error?
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message");
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
    try {
      await agentApi.acceptSession(sessionId);
      // Refresh inbox to update status
      fetchInbox();
      // Update local selected session status
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: "assigned" as const } : s,
        ),
      );
    } catch (error) {
      console.error("Failed to accept session", error);
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

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Sidebar: Chat List */}
      <Card className="w-1/3 flex flex-col min-w-[300px]">
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
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {FILTER_TABS.map((tab) => (
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
              </button>
            ))}
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

      {/* Main: Chat Window */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedSessionId ? (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 border-b bg-muted/20">
              <div>
                <div className="font-semibold">
                  {selectedSession?.contactName || selectedSession?.contactId}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                {selectedSession?.status === "unassigned" && (
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSession(selectedSessionId)}
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
                  </>
                )}
              </div>
            </CardHeader>

            <ChatWindow messages={messages} currentUserId={currentUserId} />

            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={
                selectedSession?.status === "resolved" ||
                selectedSession?.status === "unassigned"
              }
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </Card>

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
