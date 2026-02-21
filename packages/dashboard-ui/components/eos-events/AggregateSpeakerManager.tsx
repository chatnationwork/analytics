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
import {
  Loader2,
  Mic,
  ExternalLink,
  Calendar,
  Plus,
  Copy,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function AggregateSpeakerManager() {
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} link copied to clipboard`);
  };

  const getPortalUrl = (token?: string) => {
    if (!token) return "#";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/eos/speaker/${token}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Aggregate Speakers</h3>
          <p className="text-sm text-muted-foreground">
            Manage all speakers across your events.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            All Active Speakers
          </CardTitle>
          <CardDescription>
            List of all speakers registered for EOS events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Speaker</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Talk Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {speakers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No speakers found.
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
                      <TableCell>
                        {speaker.invitationToken && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                copyToClipboard(
                                  getPortalUrl(speaker.invitationToken),
                                  "Speaker Portal",
                                )
                              }
                              title="Copy Portal Link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <a
                              href={getPortalUrl(speaker.invitationToken)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/eos-events/${speaker.eventId}`}>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
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
