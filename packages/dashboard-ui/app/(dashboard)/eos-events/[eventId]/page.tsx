"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { eventsApi } from "@/lib/eos-events-api";
import {
  EosEvent,
  EosExhibitor,
  EosTicketType,
  EosEventMetrics,
} from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueGrid } from "@/components/eos-events/VenueGrid";
import { TicketTypeManager } from "@/components/eos-events/TicketTypeManager";
import { ExhibitorManager } from "@/components/eos-events/ExhibitorManager";
import { SpeakerManager } from "@/components/eos-events/SpeakerManager";
import { TicketManager } from "@/components/eos-events/TicketManager";
import { VenueMapEditor } from "@/components/eos-events/VenueMapEditor";
import { EngagementManager } from "@/components/eos-events/EngagementManager";
import { EventOverviewCard } from "@/components/eos-events/EventOverviewCard";
import InviteModal from "@/components/eos-events/InviteModal";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Circle,
  Send,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ReadinessItem {
  label: string;
  done: boolean;
  tab?: string;
  required?: boolean;
}

function CampaignStatsCard({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.getCampaignStats(eventId);
      setStats(data);
    } catch (e) {
      console.error("Failed to load campaign stats", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [eventId]);

  if (loading) return <Loader2 className="animate-spin h-4 w-4" />;
  if (!stats || stats.campaigns?.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
        <Send className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No invitations sent yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats.summary.totalInvitesSent}
            </div>
            <p className="text-xs text-muted-foreground">Total Invites Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats.summary.totalTickets}
            </div>
            <p className="text-xs text-muted-foreground">Tickets Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats.summary.invitationConversionRate}%
            </div>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Recent Invitations</h4>
        <div className="border rounded-md divide-y">
          {stats.campaigns.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${c.status === "completed" ? "bg-green-500" : "bg-blue-500 animate-pulse"}`}
                />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold">{c.sent}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Recipients
                  </div>
                </div>
                <Link
                  href={`/broadcast/${c.id}`}
                  className="p-2 hover:bg-muted rounded-md text-blue-500"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublishReadinessCard({
  items,
  onTabChange,
}: {
  items: ReadinessItem[];
  onTabChange: (tab: string) => void;
}) {
  const allDone = items.every((i) => i.done);

  return (
    <Card
      className={`border-l-4 ${allDone ? "border-l-green-500 bg-green-500/5" : "border-l-amber-500 bg-amber-500/5"}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Publish Readiness
          </CardTitle>
          <Badge
            variant={allDone ? "default" : "outline"}
            className={allDone ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {items.filter((i) => i.done).length}/{items.length} Complete
          </Badge>
        </div>
        <CardDescription>
          {allDone
            ? "Your event is ready to be published!"
            : "Complete the following steps to publish your event."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex items-center justify-between transition-colors cursor-pointer hover:bg-muted/50 ${item.done ? "bg-background border-green-500/20" : "bg-background border-dashed"}`}
              onClick={() => item.tab && onTabChange(item.tab)}
            >
              <div className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${item.done ? "font-medium" : "text-muted-foreground"}`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EosEventDetailsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EosEvent | null>(null);
  const [metrics, setMetrics] = useState<EosEventMetrics | null>(null);
  const [venueLayout, setVenueLayout] = useState<{
    grid: any;
    slots: any[];
    exhibitors: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [ticketTypes, setTicketTypes] = useState<EosTicketType[]>([]);
  const [exhibitors, setExhibitors] = useState<EosExhibitor[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventData, layoutData, ttData, exData, spData, metricsData] =
          await Promise.all([
            eventsApi.get(eventId),
            eventsApi.getVenueLayout(eventId),
            eventsApi.listTicketTypes(eventId),
            eventsApi.listExhibitors(eventId),
            eventsApi.listSpeakers(eventId),
            eventsApi.getMetrics(eventId),
          ]);
        setEvent(eventData);
        setVenueLayout(layoutData);
        setTicketTypes(ttData ?? []);
        setExhibitors(exData ?? []);
        setSpeakers(spData ?? []);
        setMetrics(metricsData);
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
      label: "Speakers added",
      done: speakers.length > 0,
      tab: "speakers",
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
          {event.status === "published" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <Send className="h-4 w-4" />
              Send Invitations
            </Button>
          )}
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

      {metrics && <EventOverviewCard metrics={metrics} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="ticket-types">Ticket Types</TabsTrigger>
          <TabsTrigger value="venue">Venue & Map</TabsTrigger>
          <TabsTrigger value="exhibitors">Exhibitors</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
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

        <TabsContent value="invitations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Invitation Performance
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                disabled={event.status !== "published"}
              >
                New Invitation
              </Button>
            </CardHeader>
            <CardContent>
              <CampaignStatsCard eventId={eventId} />
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

        <TabsContent value="speakers">
          <Card>
            <CardContent className="p-6">
              <SpeakerManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardContent className="p-6">
              <EngagementManager
                eventId={eventId}
                ownerId={eventId}
                ownerType="event"
              />
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

      <InviteModal
        event={event}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          // Optionally refresh campaign stats here if we had a ref
        }}
      />
    </div>
  );
}
