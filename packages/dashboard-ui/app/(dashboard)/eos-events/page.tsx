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
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.list();
      setEvents(res);
    } catch (e) {
      console.error("Failed to fetch events", e);
      setError(
        "Could not load events. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex justify-between items-center">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={loadEvents}>
            Retry
          </Button>
        </div>
      )}

      {!error && events.length === 0 ? (
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
