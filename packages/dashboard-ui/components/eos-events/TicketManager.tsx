"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Search,
  Plus,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { eventsApi } from "@/lib/eos-events-api";
import { toast } from "sonner";
import { EosTicket, EosTicketType } from "@/types/eos-events";

interface TicketManagerProps {
  eventId: string;
  hideManualIssue?: boolean;
}

export function TicketManager({
  eventId,
  hideManualIssue = false,
}: TicketManagerProps) {
  const [tickets, setTickets] = useState<EosTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<EosTicketType[]>([]);
  const [manualDto, setManualDto] = useState({
    ticketTypeId: "",
    holderName: "",
    holderPhone: "",
    customTicketCode: "",
  });

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.listTickets(eventId);
      setTickets(data);
    } catch (e) {
      console.error("Failed to load tickets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // Also load ticket types for manual issue
    eventsApi
      .listTicketTypes(eventId)
      .then(setTicketTypes)
      .catch(console.error);
  }, [eventId]);

  const handleResend = async (ticketId: string) => {
    setResending(ticketId);
    try {
      const res = await eventsApi.resendTicket(eventId, ticketId);
      if (res.triggeredCount > 0) {
        toast.success("Ticket delivery initiated via WhatsApp");
      } else {
        toast.warning(
          "Ticket was verified, but no active WhatsApp campaign was found for this trigger.",
        );
      }
    } catch (e) {
      console.error("Failed to resend ticket", e);
      toast.error("Failed to resend ticket");
    } finally {
      setResending(null);
    }
  };

  const handleManualIssue = async () => {
    try {
      const res: any = await eventsApi.manualIssueTicket(eventId, manualDto);
      const triggered = res.triggerResults?.triggeredCount ?? 0;

      if (triggered > 0) {
        toast.success("Ticket issued and WhatsApp delivery initiated!");
      } else {
        toast.success("Ticket issued.");
        toast.warning(
          "Note: No active WhatsApp campaign found; message not sent.",
          {
            duration: 6000,
          },
        );
      }

      setIsManualDialogOpen(false);
      setManualDto({
        ticketTypeId: "",
        holderName: "",
        holderPhone: "",
        customTicketCode: "",
      });
      loadTickets();
    } catch (e) {
      console.error("Manual issue failed", e);
      toast.error("Failed to issue ticket");
    }
  };

  const handleCheckIn = async (code: string) => {
    if (!code) return;
    setCheckingIn(true);
    try {
      await eventsApi.checkIn(eventId, code);
      toast.success(`Check-in successful for ${code}`);
      loadTickets();
    } catch (e) {
      console.error("Check-in failed", e);
      toast.error("Check-in failed. Please verify the ticket code.");
    } finally {
      setCheckingIn(false);
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
      t.holderName?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-9 bg-background/50 border-primary/10 focus:border-primary/30 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!hideManualIssue && (
          <Dialog
            open={isManualDialogOpen}
            onOpenChange={setIsManualDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30 text-primary transition-all shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" /> Manual Issue (VIP)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Manual Ticket Issuance</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Ticket Type</Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={manualDto.ticketTypeId}
                    onChange={(e) =>
                      setManualDto({
                        ...manualDto,
                        ticketTypeId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select a ticket type...</option>
                    {ticketTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name} (KES {tt.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="m-name">Holder Name</Label>
                  <Input
                    id="m-name"
                    value={manualDto.holderName}
                    onChange={(e) =>
                      setManualDto({ ...manualDto, holderName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="m-phone">Holder Phone (WhatsApp)</Label>
                  <Input
                    id="m-phone"
                    placeholder="e.g. 2547..."
                    value={manualDto.holderPhone}
                    onChange={(e) =>
                      setManualDto({
                        ...manualDto,
                        holderPhone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="m-code">Custom Ticket Code (Optional)</Label>
                  <Input
                    id="m-code"
                    placeholder="Defaults to VIP_XXXX"
                    value={manualDto.customTicketCode}
                    onChange={(e) =>
                      setManualDto({
                        ...manualDto,
                        customTicketCode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleManualIssue}
                disabled={
                  !manualDto.ticketTypeId ||
                  !manualDto.holderPhone ||
                  !manualDto.holderName
                }
              >
                Issue & Send WhatsApp
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holder</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {search
                    ? "No tickets match your search."
                    : "No tickets issued yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium">
                      {ticket.holderName || "Anonymous"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.holderEmail}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {ticket.ticketCode}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {(ticket as any).ticketType?.name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(ticket as any).ticketType?.metadata?.perks &&
                        Object.entries(
                          (ticket as any).ticketType.metadata.perks,
                        )
                          .filter(([_, isActive]) => isActive)
                          .map(([key]) => {
                            const labels: Record<string, string> = {
                              vipLounge: "VIP Lounge",
                              privateRoom: "Private Room",
                              dedicatedCatering: "Catering",
                              prioritySeating: "Priority Seat",
                              vipEscort: "Escort",
                            };
                            return (
                              <Badge
                                key={key}
                                variant="secondary"
                                className="text-[10px] h-4 px-1 leading-none bg-primary/10 text-primary border-primary/20"
                              >
                                {labels[key] || key}
                              </Badge>
                            );
                          })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge
                      status={ticket.status}
                      paymentStatus={ticket.paymentStatus}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {ticket.status === "valid" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Resend via WhatsApp"
                            onClick={() => handleResend(ticket.id)}
                            disabled={resending === ticket.id}
                          >
                            {resending === ticket.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckIn(ticket.ticketCode)}
                          >
                            Check In
                          </Button>
                        </>
                      )}
                      {ticket.status === "used" && (
                        <Badge
                          variant="outline"
                          className="text-green-600 bg-green-50"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Checked In
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
