"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type LiveEventRow } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  Activity,
  RefreshCw,
  Search,
  MessageCircle,
  Brain,
  AlertTriangle,
  Eye,
  User,
  MousePointer2,
  FileText,
  Terminal,
} from "lucide-react";

const SINCE_OPTIONS = [
  { value: "5", label: "Last 5 minutes" },
  { value: "15", label: "Last 15 minutes" },
  { value: "60", label: "Last 60 minutes" },
];

/** Common event names so the filter is useful even with no/empty API distinct list */
const COMMON_EVENT_NAMES = [
  "page_view",
  "button_click",
  "form_submit",
  "identify",
  "app_error",
];

/** Friendly labels for event types (filter dropdown and list) */
const EVENT_TYPE_LABELS: Record<string, string> = {
  page_view: "Page view",
  button_click: "Button click",
  form_submit: "Form submit",
  identify: "User identified",
  app_error: "App error",
  "message.received": "Message received",
  "message.sent": "Message sent",
  "message.read": "Message read",
  "message.delivered": "Message delivered",
  "agent.handoff": "Handoff to agent",
  "chat.resolved": "Chat resolved",
  "chat.transferred": "Chat transferred",
  "ai.classification": "AI classification",
  "ai.error": "AI error",
  "messages sent": "Messages sent",
  "messages received": "Messages received",
  "debug.test_event": "Debug test",
};

function getEventTypeLabel(name: string): string {
  return (
    EVENT_TYPE_LABELS[name] ??
    name
      .replace(/_/g, " ")
      .replace(/\./g, " · ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const POLL_INTERVAL_MS = 10_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function EventRow({ event }: { event: LiveEventRow }) {
  const isError = event.eventName === "app_error";
  const propsStr =
    event.properties && Object.keys(event.properties).length > 0
      ? JSON.stringify(event.properties)
      : "";
  const propsShort =
    propsStr.length > 80 ? propsStr.slice(0, 80) + "…" : propsStr;

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-2 px-3 text-sm last:border-b-0"
      title={propsStr || undefined}
    >
      <span className="font-medium text-foreground shrink-0">
        {getEventTypeLabel(event.eventName)}
      </span>
      {isError && (
        <span className="rounded bg-destructive/20 text-destructive px-1.5 py-0.5 text-xs font-medium shrink-0">
          Error
        </span>
      )}
      <span className="text-muted-foreground shrink-0">
        {formatTime(event.timestamp)}
      </span>
      <span
        className="text-muted-foreground font-mono text-xs truncate max-w-[180px]"
        title={event.sessionId}
      >
        {event.sessionId}
      </span>
      {/* {event.pagePath && (
        <span
          className="text-muted-foreground truncate max-w-[200px]"
          title={event.pagePath}
        >
          {event.pagePath}
        </span>
      )}
      {propsShort && (
        <span className="text-muted-foreground font-mono text-xs truncate max-w-[240px]">
          {propsShort}
        </span>
      )} */}
    </div>
  );
}

function getEventIcon(name: string) {
  if (name.startsWith("message.")) return <MessageCircle className="h-4 w-4 text-blue-500" />;
  if (name.startsWith("ai.")) return <Brain className="h-4 w-4 text-purple-500" />;
  if (name === "app_error") return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (name === "page_view") return <Eye className="h-4 w-4 text-gray-500" />;
  if (name === "identify") return <User className="h-4 w-4 text-green-500" />;
  if (name === "button_click") return <MousePointer2 className="h-4 w-4 text-orange-500" />;
  if (name === "form_submit") return <FileText className="h-4 w-4 text-indigo-500" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

export default function EventsPage() {
  const [sinceMinutes, setSinceMinutes] = useState(60);
  const [eventName, setEventName] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<LiveEventRow | null>(null);
  const limit = 200;

  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  const { data: distinctNames } = useQuery({
    queryKey: ["events-distinct", tenant?.tenantId],
    queryFn: () => api.getDistinctEvents(tenant?.tenantId),
    enabled: !!tenant?.tenantId,
  });

  const eventTypeOptions = useMemo(() => {
    const fromApi = distinctNames ?? [];
    const combined = [...new Set([...COMMON_EVENT_NAMES, ...fromApi])].sort();
    return combined;
  }, [distinctNames]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["events-recent", sinceMinutes, limit, eventName],
    queryFn: () => api.getRecentEvents(sinceMinutes, limit, eventName),
    enabled: typeof window !== "undefined" && !!tenant?.tenantId,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const events: LiveEventRow[] = data?.events ?? [];
  
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e => 
      e.sessionId.toLowerCase().includes(q) || 
      e.eventName.toLowerCase().includes(q) ||
      (e.pagePath && e.pagePath.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  const activeCount =
    filteredEvents.length > 0 ? new Set(filteredEvents.map((e) => e.sessionId)).size : 0;

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Events
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live event stream (updates every {POLL_INTERVAL_MS / 1000}s). Filter
            by time window and event type.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Live Event Stream</CardTitle>
              <div className="flex items-center gap-2">
                {events.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {activeCount} session{activeCount !== 1 ? "s" : ""} ·{" "}
                    {events.length} event{events.length !== 1 ? "s" : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-50"
                  title="Refresh now"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search session, user, path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[240px] pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Time window
                </label>
                <Select
                  value={String(sinceMinutes)}
                  onValueChange={(v) => setSinceMinutes(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SINCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Event type
                </label>
                <Select
                  value={eventName ?? "all"}
                  onValueChange={(v) =>
                    setEventName(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {eventTypeOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {getEventTypeLabel(name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <div className="p-4 text-destructive text-sm">
                {error instanceof Error
                  ? error.message
                  : "Failed to load events"}
              </div>
            )}
            {!isLoading && !error && filteredEvents.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No events found matching your criteria.
              </div>
            )}
            {!isLoading && !error && filteredEvents.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Session / User</TableHead>
                      <TableHead>Properties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                       const propsStr =
                        event.properties && Object.keys(event.properties).length > 0
                          ? JSON.stringify(event.properties)
                          : "";
                      const propsShort =
                        propsStr.length > 60 ? propsStr.slice(0, 60) + "…" : propsStr;

                      return (
                        <TableRow 
                          key={event.eventId} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getEventIcon(event.eventName)}
                              <span>{getEventTypeLabel(event.eventName)}</span>
                              {event.eventName === "app_error" && (
                                <span className="rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase">
                                  Error
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{formatTime(event.timestamp)}</span>
                              <span className="text-[10px]">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 max-w-[180px]">
                              <span className="font-mono text-xs truncate" title={event.sessionId}>
                                {event.sessionId}
                              </span>
                              {event.userId && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" /> {event.userId}
                                </span>
                              )}
                              {event.pagePath && (
                                <span className="text-xs text-muted-foreground truncate" title={event.pagePath}>
                                  {event.pagePath}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs max-w-[300px] truncate" title={propsStr}>
                            {propsShort}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent && getEventIcon(selectedEvent.eventName)}
                {selectedEvent ? getEventTypeLabel(selectedEvent.eventName) : "Event Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-muted-foreground">Timestamp</h4>
                    <p>{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground">Session ID</h4>
                    <p className="font-mono text-xs">{selectedEvent.sessionId}</p>
                  </div>
                  {selectedEvent.userId && (
                    <div>
                      <h4 className="font-semibold text-muted-foreground">User ID</h4>
                      <p>{selectedEvent.userId}</p>
                    </div>
                  )}
                  {selectedEvent.pagePath && (
                    <div>
                      <h4 className="font-semibold text-muted-foreground">Page Path</h4>
                      <p>{selectedEvent.pagePath}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-muted-foreground text-sm">Properties</h4>
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedEvent.properties, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-muted-foreground text-sm">Raw Event Data</h4>
                   <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedEvent, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
