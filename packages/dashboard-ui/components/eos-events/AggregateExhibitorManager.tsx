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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Store,
  ExternalLink,
  Plus,
  MapPin,
  QrCode,
  UserPlus,
  Globe,
  Copy,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function AggregateExhibitorManager() {
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} link copied to clipboard`);
  };

  const getPortalUrl = (path: string, token?: string) => {
    if (!token) return "#";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/eos/${path}/${token}`;
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
          <h3 className="text-xl font-bold">Aggregate Exhibitors</h3>
          <p className="text-sm text-muted-foreground">
            Monitor partners and booth allocations across all events.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            All Event Partners
          </CardTitle>
          <CardDescription>
            Managing onboarding and collateral for event exhibitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Booth Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Portals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exhibitors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                              Public Portals
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(
                                  getPortalUrl(
                                    "onboarding",
                                    ex.invitationToken,
                                  ),
                                  "Onboarding",
                                )
                              }
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              <span>Copy Onboarding Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(
                                  getPortalUrl(
                                    "booth",
                                    ex.boothToken || ex.invitationToken,
                                  ),
                                  "Booth",
                                )
                              }
                            >
                              <QrCode className="mr-2 h-4 w-4" />
                              <span>Copy Booth Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(
                                  getPortalUrl("exhibitor", ex.invitationToken),
                                  "Profile",
                                )
                              }
                            >
                              <Globe className="mr-2 h-4 w-4" />
                              <span>Copy Profile Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a
                                href={getPortalUrl(
                                  "booth",
                                  ex.boothToken || ex.invitationToken,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                <span>Open Booth Portal</span>
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/eos-events/${ex.eventId}`}>
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
