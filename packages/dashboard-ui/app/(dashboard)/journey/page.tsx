"use client";

import { useState, useMemo } from "react";
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
  MessageSquare,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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

interface Session {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  eventCount: number;
  deviceType: string | null;
  entryPage: string | null;
  converted: boolean;
  events: JourneyEvent[];
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <Globe className="w-4 h-4" />,
  button_click: <Smartphone className="w-4 h-4" />,
  "message.received": <MessageSquare className="w-4 h-4 text-blue-500" />,
  "message.sent": <MessageSquare className="w-4 h-4 text-green-500" />,
  "agent.handoff": <User className="w-4 h-4 text-amber-500" />,
  "chat.resolved": <CheckCircle className="w-4 h-4 text-green-600" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

function getEventIcon(eventName: string): React.ReactNode {
  if (eventName.startsWith("message.")) return EVENT_ICONS["message.received"];
  return EVENT_ICONS[eventName] || <Clock className="w-4 h-4 text-muted-foreground" />;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${seconds % 60}s`;
}

const SIGNIFICANT_EVENTS = [
  "message.received",
  "message.sent",
  "agent.handoff",
  "chat.resolved",
  "conversion",
  "error"
];

function SessionCard({ session }: { session: Session }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const startTime = new Date(session.startedAt);
  const isRecent = Date.now() - startTime.getTime() < 24 * 60 * 60 * 1000;

  const filteredEvents = showAllEvents 
    ? session.events 
    : session.events.filter(e => {
        // Always show if it's in the specific meaningful list
        if (SIGNIFICANT_EVENTS.includes(e.eventName)) return true;
        // Also show if it has a pagePath (navigation) but maybe limit duplicates? 
        // For now, let's just stick to the list + explicit page views if they seem important
        if (e.eventName === "page_view") return false; // Hide page views by default
        return false; 
      });

  // If filtering hides everything, show a summary or unfilter
  // Fallback: If filtered list is empty but real list isn't, show some default
  const eventsToShow = filteredEvents.length > 0 ? filteredEvents : session.events.length < 5 ? session.events : filteredEvents;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div 
        className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {formatDate(session.startedAt)} • {formatTime(session.startedAt)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3 h-3" /> {formatDuration(session.durationSeconds)}
              {session.deviceType && (
                <>
                  <span>•</span>
                  <span>{session.deviceType}</span>
                </>
              )}
            </span>
          </div>
          {session.converted && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium border border-green-200">
              Converted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{session.events.length} events</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 relative">
          <div className="flex justify-end mb-4">
            <label className="text-xs flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input 
                type="checkbox" 
                checked={showAllEvents} 
                onChange={() => setShowAllEvents(!showAllEvents)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Show all events ({session.events.length})
            </label>
          </div>

          <div className="absolute left-6 top-14 bottom-4 w-px bg-border" />
          <div className="space-y-4">
            {eventsToShow.length === 0 && !showAllEvents && (
               <div className="text-xs text-muted-foreground pl-8 italic">
                 No significant events. Check "Show all events" to see page views.
               </div>
            )}
            {eventsToShow.map((event, i) => (
              <div key={event.eventId} className="relative pl-8 group">
                <div className="absolute left-[21px] top-1.5 w-2 h-2 rounded-full bg-background border-2 border-primary z-10 transform -translate-x-1/2" />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {getEventIcon(event.eventName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {event.eventName.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.pagePath && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {event.pagePath}
                      </div>
                    )}
                    {event.properties && Object.keys(event.properties).length > 0 && (
                      <div className="mt-1.5 text-xs bg-muted/30 p-2 rounded border border-border/50 font-mono text-muted-foreground overflow-x-auto">
                        {JSON.stringify(event.properties, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
    if (searchResults?.users && searchResults.users.length > 0) {
      const user = searchResults.users[0];
      setSelectedUser({ id: user.id, type: user.type });
    }
  };

  const selectUser = (user: { id: string; type: "userId" | "anonymousId" }) => {
    setSelectedUser(user);
    setSearchQuery(""); // Clear search on select
  };

  // Process sessions with events
  const sessions = useMemo(() => {
    if (!journeyData) return [];

    const sessionMap = new Map<string, Session>();
    
    // Initialize sessions from journeyData.sessions
    journeyData.sessions.forEach(s => {
      sessionMap.set(s.sessionId, { ...s, events: [] });
    });

    // Distribute events to sessions
    journeyData.events.forEach(event => {
      let session = sessionMap.get(event.sessionId);
      
      // Handle events with unknown sessions (orphaned)
      if (!session) {
        // Create a synthetic session for orphaned events
        // Usually grouping by date/hour if needed, but for simplicity:
        // We'll skip or recreate if strictly needed. 
        // For now, let's create a placeholder session if missing
        session = {
          sessionId: event.sessionId,
          startedAt: event.timestamp,
          endedAt: null,
          durationSeconds: 0,
          eventCount: 1,
          deviceType: "Unknown",
          entryPage: event.pagePath,
          converted: false,
          events: []
        };
        sessionMap.set(event.sessionId, session);
      }
      
      session.events.push(event);
    });

    // Sort sessions by date desc
    return Array.from(sessionMap.values())
      .filter(s => s.events.length > 0) // Hide empty sessions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [journeyData]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">User Journey Explorer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Deep dive into individual user paths, sessions, and interactions.
        </p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm z-50 relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by User ID, Anonymous ID, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchQuery.length < 2}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.length >= 2 && searchResults?.users && searchResults.users.length > 0 && !selectedUser && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
            {searchResults.users.map((user) => (
              <button
                key={`${user.type}-${user.id}`}
                onClick={() => selectUser({ id: user.id, type: user.type })}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
              >
                <div>
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {user.id}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      user.type === 'userId' ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-orange-500/10 text-orange-600 border-orange-200'
                    }`}>
                      {user.type === 'userId' ? 'Verified' : 'Anonymous'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {user.totalSessions} sessions • {user.totalEvents} events
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>Last seen</div>
                  <div className="font-medium">{formatDate(user.lastSeen)}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty States */}
        {searchQuery.length >= 2 && !isSearching && searchResults?.users?.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
            No users found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* No selection state */}
      {!selectedUser && (
         <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
             <Search className="w-8 h-8 text-muted-foreground" />
           </div>
           <h3 className="text-lg font-medium text-foreground">No User Selected</h3>
           <p className="text-sm text-muted-foreground max-w-xs mt-2">
             Search for a user above to view their complete journey history and session details.
           </p>
         </div>
      )}

      {/* Loading state */}
      {selectedUser && isLoadingJourney && (
         <div className="flex flex-col items-center justify-center py-20">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
           <p className="text-muted-foreground">Loading user journey...</p>
         </div>
      )}

      {/* User Card & Timeline */}
      {selectedUser && journeyData && !isLoadingJourney && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* User Profile Header */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {journeyData.user.type === "userId" ? <User /> : "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground break-all">{journeyData.user.id}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        journeyData.user.type === "userId" 
                          ? "bg-green-500/10 text-green-600 border-green-200" 
                          : "bg-orange-500/10 text-orange-600 border-orange-200"
                      }`}>
                        {journeyData.user.type === "userId" ? "Identified User" : "Anonymous Visitor"}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">First seen {formatDate(journeyData.user.firstSeen)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 border-t border-border pt-6">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{journeyData.user.totalSessions}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Sessions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{journeyData.user.totalEvents}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Events</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{sessions.filter(s => s.converted).length}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Conversions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <span>Sessions History</span>
              <span>{sessions.length} sessions found</span>
            </div>
            
            {sessions.map(session => (
              <SessionCard key={session.sessionId} session={session} />
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No sessions found for this user.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


