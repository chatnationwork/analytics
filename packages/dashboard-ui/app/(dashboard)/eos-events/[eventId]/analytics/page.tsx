"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TicketingAnalytics } from "@/components/eos-events/TicketingAnalytics";
import { Card, CardContent } from "@/components/ui/card";

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <Card>
        <CardContent className="p-6">
          <TicketingAnalytics eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
