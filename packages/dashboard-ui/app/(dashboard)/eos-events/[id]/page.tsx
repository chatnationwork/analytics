"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent, EosExhibitor } from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueGrid } from "@/components/eos-events/VenueGrid";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    async function loadData() {
      try {
        const [eventData, layoutData] = await Promise.all([
          eventsApi.get(eventId),
          eventsApi.getVenueLayout(eventId),
        ]);
        setEvent(eventData);
        setVenueLayout(layoutData);
      } catch (e) {
        console.error("Failed to load event", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!event) return <div className="p-8">Event not found</div>;

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
            <Button onClick={() => eventsApi.publish(event.id)}>
              Publish Event
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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

        <TabsContent value="venue">
          {venueLayout ? (
            <VenueGrid
              grid={venueLayout.grid}
              slots={venueLayout.slots}
              exhibitors={venueLayout.exhibitors}
            />
          ) : (
            <div>No venue layout configured</div>
          )}
        </TabsContent>

        <TabsContent value="exhibitors">
          <div className="p-4 bg-muted rounded text-center text-muted-foreground">
            Exhibitor management implementation needed...
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <div className="p-4 bg-muted rounded text-center text-muted-foreground">
            Ticket management implementation needed...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
