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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checked-in Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TicketManager eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
