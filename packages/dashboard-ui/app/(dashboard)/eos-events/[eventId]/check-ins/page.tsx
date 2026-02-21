"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketManager } from "@/components/eos-events/TicketManager";

export default function EventCheckInsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
        <p className="text-muted-foreground">
          Monitor and manage attendee entry for your event.
        </p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <TicketManager eventId={eventId} hideManualIssue />
        </div>
      </div>
    </div>
  );
}
