"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/eos-events/EventCard";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent } from "@/types/eos-events";
import { Loader2, Plus } from "lucide-react";

export default function EosEventsPage() {
  const [events, setEvents] = useState<EosEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        // eventsApi.findAll was not in the original api client?
        // Wait, I added get (findAll) to the backend in Step 251.
        // I need to update eventsApi to include list/findAll.
        const res = await eventsApi.list();
        setEvents(res);
      } catch (e) {
        console.error("Failed to fetch events", e);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">EOS Events</h1>
        <Link href="/eos-events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted">
          <h3 className="text-lg font-medium">No events yet</h3>
          <p className="text-muted-foreground mt-1">
            Get started by creating your first EOS event.
          </p>
          <div className="mt-6">
            <Link href="/eos-events/new">
              <Button>Create Event</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
