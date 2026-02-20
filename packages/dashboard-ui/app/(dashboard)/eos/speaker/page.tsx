"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosSpeaker, EosEvent } from "@/types/eos-events";
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
import { Loader2, Mic, ExternalLink, Calendar, Plus } from "lucide-react";
import Link from "next/link";

export default function AllSpeakersPage() {
  const [speakers, setSpeakers] = useState<
    (EosSpeaker & { event?: EosEvent })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllSpeakers() {
      try {
        const events = await eventsApi.list();
        const allSpeakers: (EosSpeaker & { event?: EosEvent })[] = [];

        await Promise.all(
          events.map(async (event) => {
            const eventSpeakers = await eventsApi.listSpeakers(event.id);
            eventSpeakers.forEach((s) => allSpeakers.push({ ...s, event }));
          }),
        );

        setSpeakers(
          allSpeakers.sort((a, b) =>
            (b as any).createdAt > (a as any).createdAt ? 1 : -1,
          ),
        );
      } catch (e) {
        console.error("Failed to load speakers", e);
      } finally {
        setLoading(false);
      }
    }
    loadAllSpeakers();
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
          <h1 className="text-3xl font-bold tracking-tight">Speakers</h1>
          <p className="text-muted-foreground">
            Manage all speakers across your events.
          </p>
        </div>
        <Link href="/eos-events">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Speaker (via Event)
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Active Speakers
          </CardTitle>
          <CardDescription>
            List of all speakers registered for EOS events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Speaker</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Talk Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {speakers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No speakers found. Create one by selecting an event.
                    </TableCell>
                  </TableRow>
                ) : (
                  speakers.map((speaker) => (
                    <TableRow key={speaker.id}>
                      <TableCell>
                        <div className="font-semibold">{speaker.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {speaker.contactEmail || speaker.contactPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/eos-events/${speaker.eventId}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px]">
                            {speaker.event?.name}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {speaker.talkTitle || "TBD"}
                        </div>
                        {speaker.sessionTime && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(speaker.sessionTime).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            speaker.status === "approved"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {speaker.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(speaker as any).invitationToken && (
                          <Link
                            href={`/eos/speaker/${(speaker as any).invitationToken}`}
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
