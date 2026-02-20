"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ExhibitorManager } from "@/components/eos-events/ExhibitorManager";
import { Card, CardContent } from "@/components/ui/card";

export default function EventExhibitorsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Exhibitors</h1>
      <Card>
        <CardContent className="p-6">
          <ExhibitorManager eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
