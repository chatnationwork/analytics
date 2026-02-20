"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosExhibitor, EosEvent } from "@/types/eos-events";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Store, ExternalLink, Plus, MapPin } from "lucide-react";
import Link from "next/link";

export default function AllExhibitorsPage() {
  const [exhibitors, setExhibitors] = useState<
    (EosExhibitor & { event?: EosEvent })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllExhibitors() {
      try {
        const events = await eventsApi.list();
        const allExhibitors: (EosExhibitor & { event?: EosEvent })[] = [];

        await Promise.all(
          events.map(async (event) => {
            const eventExhibitors = await eventsApi.listExhibitors(event.id);
            eventExhibitors.forEach((e) => allExhibitors.push({ ...e, event }));
          }),
        );

        setExhibitors(
          allExhibitors.sort((a, b) =>
            (b as any).createdAt > (a as any).createdAt ? 1 : -1,
          ),
        );
      } catch (e) {
        console.error("Failed to load exhibitors", e);
      } finally {
        setLoading(false);
      }
    }
    loadAllExhibitors();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exhibitors</h1>
          <p className="text-muted-foreground">
            Monitor partners and booth allocations.
          </p>
        </div>
        <Link href="/eos-events">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Partner (via Event)
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Event Partners
          </CardTitle>
          <CardDescription>
            Managing onboarding and collateral for event exhibitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Booth Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exhibitors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No exhibitors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  exhibitors.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell>
                        <div className="font-semibold">{ex.name}</div>
                        {ex.logoUrl && (
                          <div className="text-[10px] text-blue-500 underline truncate max-w-[120px]">
                            Logo Attached
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/eos-events/${ex.eventId}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px]">
                            {ex.event?.name}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{ex.boothNumber || "Not Assigned"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ex.status === "approved"
                              ? "default"
                              : ex.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {ex.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(ex as any).invitationToken && (
                          <Link
                            href={`/eos/exhibitor/${(ex as any).invitationToken}`}
                            target="_blank"
                          >
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
