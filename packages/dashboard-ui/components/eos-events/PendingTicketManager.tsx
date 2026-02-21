"use client";

import { useState, useEffect } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosTicket } from "@/types/eos-events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCcw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TicketStatusBadge } from "./TicketStatusBadge";

export function PendingTicketManager({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = useState<EosTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [eventId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const allTickets = await eventsApi.listTickets(eventId);
      // Filter for tickets that are not "completed" or "valid" (showing pending, failed, etc.)
      const pending = allTickets.filter(
        (t) => t.paymentStatus !== "completed" || t.status !== "valid",
      );
      setTickets(pending);
    } catch (e) {
      console.error("Failed to load tickets", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      await eventsApi.resendTicket(eventId, id);
      toast.success("Ticket link resent via WhatsApp");
    } catch (e) {
      toast.error("Failed to resend ticket");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment & Fulfillment Status</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTickets}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            No pending or failed tickets at the moment.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holder</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium">{ticket.holderName}</div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.holderPhone || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ticket.paymentStatus === "pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {ticket.paymentStatus.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge
                      status={ticket.status}
                      paymentStatus={ticket.paymentStatus}
                    />
                  </TableCell>
                  <TableCell>KES {ticket.amountPaid || 0}</TableCell>
                  <TableCell className="text-right">
                    {ticket.paymentStatus === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(ticket.id)}
                      >
                        Resend WhatsApp
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
