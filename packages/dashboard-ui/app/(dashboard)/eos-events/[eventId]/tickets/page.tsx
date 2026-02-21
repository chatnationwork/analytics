"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TicketManager } from "@/components/eos-events/TicketManager";
import { TicketTypeManager } from "@/components/eos-events/TicketTypeManager";
import { LocationManager } from "@/components/eos-events/LocationManager";
import { ScanLogViewer } from "@/components/eos-events/ScanLogViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Ticketing Operations
      </h1>

      <Tabs defaultValue="management">
        <TabsList>
          <TabsTrigger value="management">Ticket Management</TabsTrigger>
          <TabsTrigger value="types">Ticket Types</TabsTrigger>
          <TabsTrigger value="locations">Entry Points</TabsTrigger>
          <TabsTrigger value="logs">Check-in Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <Card>
            <CardContent className="p-6">
              <TicketManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card>
            <CardContent className="p-6">
              <TicketTypeManager eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <LocationManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="logs">
          <ScanLogViewer eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
