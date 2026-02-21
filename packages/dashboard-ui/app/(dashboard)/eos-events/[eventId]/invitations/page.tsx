"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventsApi } from "@/lib/eos-events-api";
import { useEffect, useState } from "react";
import { EosEvent } from "@/types/eos-events";
import { Loader2 } from "lucide-react";
import InviteModal from "@/components/eos-events/InviteModal";

// Local component copied from original page.tsx
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
        {/* Simplified stats display */}
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
      {/* ... Recent Invitations list could go here if needed ... */}
    </div>
  );
}

export default function EventInvitationsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EosEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <Loader2 className="animate-spin" />;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          disabled={event.status !== "published"}
        >
          <Send className="mr-2 h-4 w-4" /> New Invitation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Invitation Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignStatsCard eventId={eventId} />
        </CardContent>
      </Card>

      <InviteModal
        event={event}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
