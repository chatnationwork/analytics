"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  Globe,
  Smartphone,
  Clock,
} from "lucide-react";

interface JourneyEvent {
  eventId: string;
  eventName: string;
  timestamp: string;
  sessionId: string;
  channelType: string | null;
  pagePath: string | null;
  properties: Record<string, unknown> | null;
}

const EVENT_ICONS: Record<string, string> = {
  page_view: "🌐",
  button_click: "👆",
  "message.received": "📱",
  "message.sent": "🤖",
  "message.read": "👁️",
  "message.delivered": "✓",
  otp_success: "🔐",
  otp_verified: "🔐",
  validation_success: "📝",
  return_filed: "📄",
  payment_initiated: "💳",
  payment_success: "✅",
  "contact.created": "👤",
  "chat.resolved": "✅",
  "ai.classification": "🤖",
};

function getEventIcon(eventName: string): string {
  return EVENT_ICONS[eventName] || "📌";
}

function getChannelColor(
  channelType: string | null,
  eventName: string,
): string {
  if (channelType === "whatsapp" || eventName.startsWith("message.")) {
    return "bg-green-500/10 text-green-500";
  }
  return "bg-blue-500/10 text-blue-500";
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getEventDetails(event: JourneyEvent): string {
  if (event.pagePath) {
    return event.pagePath;
  }
  if (event.properties) {
    // Try to extract meaningful details from properties
    const props = event.properties;
    if (props.message) return String(props.message).substring(0, 50);
    if (props.text) return String(props.text).substring(0, 50);
    if (props.error) return `Error: ${props.error}`;
    if (props.intent) return `Intent: ${props.intent}`;
  }
  return "";
}

export default function JourneyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    type: "userId" | "anonymousId";
  } | null>(null);

  // Fetch current tenant
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  // Search for users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["userSearch", searchQuery, tenant?.tenantId],
    queryFn: () => api.searchUsers(searchQuery, tenant?.tenantId),
    enabled: !!tenant?.tenantId && searchQuery.length >= 2,
  });

  // Get user journey when a user is selected
  const { data: journeyData, isLoading: isLoadingJourney } = useQuery({
    queryKey: [
      "userJourney",
      selectedUser?.id,
      selectedUser?.type,
      tenant?.tenantId,
    ],
    queryFn: () =>
      api.getUserJourney(
        selectedUser!.id,
        selectedUser!.type,
        tenant?.tenantId,
      ),
    enabled: !!selectedUser && !!tenant?.tenantId,
  });

  const handleSearch = () => {
    // Search is automatic via react-query, but we can select first result
    if (searchResults?.users && searchResults.users.length > 0) {
      const user = searchResults.users[0];
      setSelectedUser({ id: user.id, type: user.type });
    }
  };

  const selectUser = (user: { id: string; type: "userId" | "anonymousId" }) => {
    setSelectedUser(user);
  };

  // Group events by date
  const eventsByDate =
    journeyData?.events?.reduce(
      (acc, event) => {
        const date = new Date(event.timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
      },
      {} as Record<string, JourneyEvent[]>,
    ) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">User Journey</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track complete user journeys across web and WhatsApp
        </p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user ID, anonymous ID, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchQuery.length < 2}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.length >= 2 &&
          searchResults?.users &&
          searchResults.users.length > 0 &&
          !selectedUser && (
            <div className="mt-3 border border-border rounded-lg overflow-hidden">
              {searchResults.users.map((user) => (
                <button
                  key={`${user.type}-${user.id}`}
                  onClick={() => selectUser({ id: user.id, type: user.type })}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium text-foreground">{user.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.type === "userId"
                        ? "Identified User"
                        : "Anonymous User"}{" "}
                      • {user.totalSessions} sessions • {user.totalEvents}{" "}
                      events
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last seen: {formatDate(user.lastSeen)}
                  </div>
                </button>
              ))}
            </div>
          )}

        {isSearching && (
          <div className="mt-3 text-sm text-muted-foreground">Searching...</div>
        )}

        {searchQuery.length >= 2 &&
          !isSearching &&
          searchResults?.users?.length === 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              No users found matching "{searchQuery}"
            </div>
          )}
      </div>

      {/* No selection state */}
      {!selectedUser && (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-medium text-foreground mb-2">
            Search for a User
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter a user ID, anonymous ID, phone number, or email to see their
            complete journey across all channels.
          </p>
        </div>
      )}

      {/* Loading state */}
      {selectedUser && isLoadingJourney && (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading journey...</p>
        </div>
      )}

      {/* User Card & Timeline */}
      {selectedUser && journeyData && !isLoadingJourney && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          {/* User Header */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl text-white">
              {journeyData.user.type === "userId" ? (
                <User className="w-6 h-6" />
              ) : (
                "?"
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg text-foreground break-all">
                {journeyData.user.id}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    journeyData.user.type === "userId"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {journeyData.user.type === "userId"
                    ? "Identified"
                    : "Anonymous"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Clear
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {journeyData.user.totalSessions}
              </div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {journeyData.user.totalEvents}
              </div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">
                {formatDate(journeyData.user.firstSeen)}
              </div>
              <div className="text-xs text-muted-foreground">First Seen</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">
                {formatDate(journeyData.user.lastSeen)}
              </div>
              <div className="text-xs text-muted-foreground">Last Seen</div>
            </div>
          </div>

          {/* Channel Legend */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Web</span>
            </div>
          </div>

          {/* Timeline grouped by date */}
          {Object.keys(eventsByDate).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No events found for this user.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(eventsByDate).map(([date, events]) => (
                <div key={date}>
                  <div className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-card py-1">
                    {date}
                  </div>
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-3">
                      {events.map((event) => {
                        const channelColor = getChannelColor(
                          event.channelType,
                          event.eventName,
                        );
                        const details = getEventDetails(event);
                        return (
                          <div
                            key={event.eventId}
                            className="flex items-start gap-4 relative"
                          >
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg relative z-10 ${
                                event.channelType === "whatsapp" ||
                                event.eventName.startsWith("message.")
                                  ? "bg-green-500/10"
                                  : "bg-blue-500/10"
                              }`}
                            >
                              {getEventIcon(event.eventName)}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-foreground">
                                  {event.eventName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(event.timestamp)}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${channelColor}`}
                                >
                                  {event.channelType || "web"}
                                </span>
                              </div>
                              {details && (
                                <div className="text-sm text-muted-foreground truncate max-w-md">
                                  {details}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
