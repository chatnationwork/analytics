"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/eos-events/EventCard";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent } from "@/types/eos-events";
import { Loader2, Plus, Store, Zap, Activity } from "lucide-react";
import { TabsNav, EosTab } from "@/components/eos-events/TabsNav";
import { SplitLanding } from "@/components/eos-events/SplitLanding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AggregateExhibitorManager } from "@/components/eos-events/AggregateExhibitorManager";
import { AggregateSpeakerManager } from "@/components/eos-events/AggregateSpeakerManager";

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
        <div className="space-y-12">
          <AggregateExhibitorManager />
          <hr className="border-border" />
          <AggregateSpeakerManager />
        </div>
      );
    }

    if (activeTab === "engagements") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Aggregate Engagement</h3>
              <p className="text-sm text-muted-foreground">
                Overview of interaction metrics across all your active events.
              </p>
            </div>
            <Link href="/overview">
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" /> View Full Analytics
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Total Polls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Active</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all published events
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Live Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Real-time</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Collecting attendee reviews
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center py-12 border rounded-lg bg-muted/30 border-dashed">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Detailed Engagement Reports</h3>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              For granular engagement data, please visit the main Analytics
              Overview.
            </p>
            <Link href="/overview" className="mt-6 inline-block">
              <Button>Go to Analytics</Button>
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  const showLanding =
    !loading && !error && events.length === 0 && activeTab === "events";

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

      <div className={!showLanding ? "mt-6" : ""}>{renderTabContent()}</div>
    </div>
  );
}
