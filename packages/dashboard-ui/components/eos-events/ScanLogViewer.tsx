"use client";

import { useState, useEffect } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosScanLog } from "@/types/eos-events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export function ScanLogViewer({ eventId }: { eventId: string }) {
  const [logs, setLogs] = useState<EosScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [eventId]);

  const loadLogs = async () => {
    try {
      const data = await eventsApi.listScanLogs(eventId);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load scan logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Success
          </Badge>
        );
      case "failed_already_used":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Already Used
          </Badge>
        );
      case "failed_location_restricted":
        return (
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            <Clock className="mr-1 h-3 w-3" />
            Restricted Location
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Real-time Scan Logs</span>
          <span className="text-xs font-normal text-muted-foreground">
            Auto-refreshes every 10s
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center">Loading scan logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No check-in activity recorded for this event yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Ticket Holder</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {log.ticket?.attendeeName || log.ticket?.id || "Unknown"}
                  </TableCell>
                  <TableCell>{log.location?.name || "N/A"}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
