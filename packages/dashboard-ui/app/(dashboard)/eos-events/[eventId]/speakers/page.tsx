"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SpeakerManager } from "@/components/eos-events/SpeakerManager";
import { Card, CardContent } from "@/components/ui/card";

export default function EventSpeakersPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Speakers</h1>
      <Card>
        <CardContent className="p-6">
          <SpeakerManager eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
