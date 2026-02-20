"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TicketManager } from "@/components/eos-events/TicketManager";
import { TicketTypeManager } from "@/components/eos-events/TicketTypeManager";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
      
      <Tabs defaultValue="management">
        <TabsList>
          <TabsTrigger value="management">Ticket Management</TabsTrigger>
          <TabsTrigger value="types">Ticket Types</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
