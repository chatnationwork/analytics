"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/eos-events/EventCard";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent } from "@/types/eos-events";
import { Loader2, Plus, Store, Zap } from "lucide-react";
import { TabsNav, EosTab } from "@/components/eos-events/TabsNav";
import { SplitLanding } from "@/components/eos-events/SplitLanding";

export default function EosEventsPage() {
  const [activeTab, setActiveTab] = useState<EosTab>("events");
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
    if (activeTab === "events") {
      loadEvents();
    }
  }, [activeTab]);

  const renderTabContent = () => {
    if (activeTab === "events") {
      if (loading) {
        return (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin" />
          </div>
        );
      }

      if (error) {
        return (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex justify-between items-center">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadEvents}>
              Retry
            </Button>
          </div>
        );
      }

      if (events.length === 0) {
        return <SplitLanding onCreated={loadEvents} />;
      }

      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      );
    }

    if (activeTab === "speakers-exhibitors") {
      return (
        <div className="text-center py-12 border rounded-lg bg-muted">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Speakers & Exhibitors</h3>
          <p className="text-muted-foreground mt-1">
            Global management of speakers and exhibitors across all your events.
          </p>
          <div className="mt-6 text-sm text-muted-foreground italic">
            Coming soon
          </div>
        </div>
      );
    }

    if (activeTab === "engagements") {
      return (
        <div className="text-center py-12 border rounded-lg bg-muted">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Engagements</h3>
          <p className="text-muted-foreground mt-1">
            Aggregate engagement metrics and activities across your events.
          </p>
          <div className="mt-6 text-sm text-muted-foreground italic">
            Coming soon
          </div>
        </div>
      );
    }

    return null;
  };

  const showLanding = !loading && !error && events.length === 0 && activeTab === "events";

  return (
    <div className="p-8 space-y-6">
      {!showLanding && (
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">EOS Events</h1>
          {activeTab === "events" && events.length > 0 && (
            <Link href="/eos-events/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Event
              </Button>
            </Link>
          )}
        </div>
      )}

      {!showLanding && (
        <TabsNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      <div className={!showLanding ? "mt-6" : ""}>
        {renderTabContent()}
      </div>
    </div>
  );
}
