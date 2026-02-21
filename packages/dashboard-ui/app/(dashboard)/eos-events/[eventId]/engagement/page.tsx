"use client";

import React from "react";
import { useParams } from "next/navigation";
import { EngagementManager } from "@/components/eos-events/EngagementManager";
import { Card, CardContent } from "@/components/ui/card";

export default function EventEngagementPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Engagement</h1>
      <Card>
        <CardContent className="p-6">
          <EngagementManager
            eventId={eventId}
            ownerId={eventId}
            ownerType="event"
          />
        </CardContent>
      </Card>
    </div>
  );
}
