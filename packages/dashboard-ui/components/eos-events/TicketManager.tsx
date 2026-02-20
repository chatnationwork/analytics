"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosTicket } from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Search } from "lucide-react";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { toast } from "sonner";

interface TicketManagerProps {
  eventId: string;
}

export function TicketManager({ eventId }: TicketManagerProps) {
  const [tickets, setTickets] = useState<EosTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [checkInCode, setCheckInCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

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
  }, [eventId]);

  const handleCheckIn = async (codeOverride?: string) => {
    const code = codeOverride || checkInCode;
    if (!code) return;
    setCheckingIn(true);
    try {
      await eventsApi.checkIn(code);
      toast.success(`Check-in successful for ${code}`);
      setCheckInCode("");
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 border-primary/20 bg-primary/5">
          <h3 className="font-semibold mb-2">Manual Check-In</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Ticket Code"
              value={checkInCode}
              onChange={(e) => setCheckInCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
            />
            <Button onClick={() => handleCheckIn()} disabled={checkingIn}>
              {checkingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Check In"
              )}
            </Button>
          </div>
        </Card>
        <div className="flex items-end flex-col justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
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
                    {ticket.status === "valid" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckIn(ticket.ticketCode)}
                      >
                        Check In
                      </Button>
                    ) : ticket.status === "used" ? (
                      <Badge
                        variant="outline"
                        className="text-green-600 bg-green-50"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" /> Checked In
                      </Badge>
                    ) : null}
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

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>;
}
