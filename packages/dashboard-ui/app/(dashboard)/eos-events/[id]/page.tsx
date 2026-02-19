"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent, EosExhibitor, EosTicketType } from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueGrid } from "@/components/eos-events/VenueGrid";
import { TicketTypeManager } from "@/components/eos-events/TicketTypeManager";
import { ExhibitorManager } from "@/components/eos-events/ExhibitorManager";
import { TicketManager } from "@/components/eos-events/TicketManager";
import { VenueMapEditor } from "@/components/eos-events/VenueMapEditor";
import { Loader2, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { toast } from "sonner";

interface ReadinessItem {
  label: string;
  done: boolean;
  tab?: string;
  required?: boolean;
}

function PublishReadinessCard({
  items,
  onTabChange,
}: {
  items: ReadinessItem[];
  onTabChange: (tab: string) => void;
}) {
  const warnings = items.filter((i) => !i.done && !i.required);
  if (warnings.length === 0) return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          Publish Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          Your event can be published now. These optional items can be added any
          time:
        </p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : item.required ? (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span
                className={
                  item.done ? "text-muted-foreground line-through" : ""
                }
              >
                {item.label}
              </span>
              {!item.done && item.tab && (
                <button
                  onClick={() => onTabChange(item.tab!)}
                  className="text-xs text-blue-500 hover:underline ml-auto"
                >
                  Add →
                </button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function EosEventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<EosEvent | null>(null);
  const [venueLayout, setVenueLayout] = useState<{
    grid: any;
    slots: any[];
    exhibitors: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [ticketTypes, setTicketTypes] = useState<EosTicketType[]>([]);
  const [exhibitors, setExhibitors] = useState<EosExhibitor[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventData, layoutData, ttData, exData] = await Promise.all([
          eventsApi.get(eventId),
          eventsApi.getVenueLayout(eventId),
          eventsApi.listTicketTypes(eventId),
          eventsApi.listExhibitors(eventId),
        ]);
        setEvent(eventData);
        setVenueLayout(layoutData);
        setTicketTypes(ttData ?? []);
        setExhibitors(exData ?? []);
      } catch (e) {
        console.error("Failed to load event", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId]);

  const handlePublish = async () => {
    if (!event) return;
    try {
      await eventsApi.publish(event.id);
      toast.success("Event published successfully!");
      // Refresh event data (Task 4.7)
      const updatedEvent = await eventsApi.get(eventId);
      setEvent(updatedEvent);
    } catch (e) {
      console.error("Failed to publish event", e);
      toast.error("Failed to publish event");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!event) return <div className="p-8">Event not found</div>;

  const readinessItems: ReadinessItem[] = [
    {
      label: "Ticket types created",
      done: ticketTypes.length > 0,
      tab: "ticket-types",
    },
    {
      label: "Exhibitors invited",
      done: exhibitors.length > 0,
      tab: "exhibitors",
    },
    {
      label: "Venue map configured",
      done: !!venueLayout?.slots?.length,
      tab: "venue",
    },
    {
      label: "Cover image uploaded",
      done: !!event?.coverImageUrl,
      tab: "overview",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="flex gap-2 mt-2">
            <Badge>{event.status}</Badge>
            <span className="text-muted-foreground">
              {new Date(event.startsAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {event.status !== "published" && (
            <Button onClick={handlePublish}>Publish Event</Button>
          )}
        </div>
      </div>

      {event.status === "draft" && (
        <PublishReadinessCard
          items={readinessItems}
          onTabChange={setActiveTab}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ticket-types">Ticket Types</TabsTrigger>
          <TabsTrigger value="venue">Venue & Map</TabsTrigger>
          <TabsTrigger value="exhibitors">Exhibitors</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket-types">
          <Card>
            <CardContent className="p-6">
              <TicketTypeManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venue">
          <VenueMapEditor
            eventId={eventId}
            event={event}
            venueLayout={venueLayout}
            onUpdate={() => {
              // Refresh data
              eventsApi.get(eventId).then(setEvent);
              eventsApi.getVenueLayout(eventId).then(setVenueLayout);
            }}
          />
        </TabsContent>

        <TabsContent value="exhibitors">
          <Card>
            <CardContent className="p-6">
              <ExhibitorManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-6">
              <TicketManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
