"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { eventsApi } from "@/lib/eos-events-api";
import { VenueMapEditor } from "@/components/eos-events/VenueMapEditor";
import { EosEvent } from "@/types/eos-events";
import { Loader2 } from "lucide-react";

export default function EventVenuePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EosEvent | null>(null);
  const [venueLayout, setVenueLayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [eventData, layoutData] = await Promise.all([
        eventsApi.get(eventId),
        eventsApi.getVenueLayout(eventId),
      ]);
      setEvent(eventData);
      setVenueLayout(layoutData);
    } catch (e) {
      console.error("Failed to load venue data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  if (loading) return <Loader2 className="animate-spin" />;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Venue & Map</h1>
      <VenueMapEditor
        eventId={eventId}
        event={event}
        venueLayout={venueLayout}
        onUpdate={loadData}
      />
    </div>
  );
}
