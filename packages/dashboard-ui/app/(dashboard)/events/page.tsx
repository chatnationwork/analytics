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
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Activity, RefreshCw } from "lucide-react";

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
      {event.pagePath && (
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
      )}
    </div>
  );
}

export default function EventsPage() {
  const [sinceMinutes, setSinceMinutes] = useState(60);
  const [eventName, setEventName] = useState<string | undefined>(undefined);
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
  const activeCount =
    events.length > 0 ? new Set(events.map((e) => e.sessionId)).size : 0;

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
                {error instanceof Error &&
                  (error.message.toLowerCase().includes("fetch") ||
                    error.message.toLowerCase().includes("network")) && (
                    <p className="mt-2 text-muted-foreground">
                      If the dashboard and API are on the same domain, leave{" "}
                      <code className="text-foreground">
                        NEXT_PUBLIC_API_URL
                      </code>{" "}
                      unset so requests use same origin. Otherwise ensure the
                      API at{" "}
                      {typeof window !== "undefined" &&
                        (process.env.NEXT_PUBLIC_API_URL || "same origin")}{" "}
                      is reachable and CORS allows your origin.
                    </p>
                  )}
              </div>
            )}
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Loading events…
              </div>
            )}
            {!isLoading && !error && events.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No events in the last {sinceMinutes} minute
                {sinceMinutes !== 1 ? "s" : ""}. Try a longer time window or
                ensure events are being sent.
              </div>
            )}
            {!isLoading && !error && events.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto rounded-b-lg">
                {events.map((event) => (
                  <EventRow key={event.eventId} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
