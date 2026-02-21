"use client";

import { useState, useEffect } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEventMetrics } from "@/types/eos-events";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Loader2, Ticket, Users, CheckCircle, Banknote } from "lucide-react";

export function TicketingAnalytics({ eventId }: { eventId: string }) {
  const [metrics, setMetrics] = useState<EosEventMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await eventsApi.getMetrics(eventId);
        setMetrics(data);
      } catch (e) {
        console.error("Failed to load metrics", e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        No metrics data available for this event.
      </div>
    );
  }

  // Mock data for charts (to be replaced with real API data if available)
  const salesData = [
    { day: "Mon", amount: 12000 },
    { day: "Tue", amount: 15000 },
    { day: "Wed", amount: 8000 },
    { day: "Thu", amount: 22000 },
    { day: "Fri", amount: 30000 },
    { day: "Sat", amount: 45000 },
    { day: "Sun", amount: 38000 },
  ];

  const scanData = [
    { hour: "08:00", count: 5 },
    { hour: "09:00", count: 45 },
    { hour: "10:00", count: 120 },
    { hour: "11:00", count: 80 },
    { hour: "12:00", count: 60 },
    { hour: "13:00", count: 150 },
    { hour: "14:00", count: 90 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTickets}</div>
            <p className="text-xs text-muted-foreground">Issued to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Gross ticket sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.checkIns}</div>
            <p className="text-xs text-muted-foreground">Tickets scanned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exhibitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalExhibitors}</div>
            <p className="text-xs text-muted-foreground">Active participants</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
            <CardDescription>Daily gross revenue in KES</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check-in Activity</CardTitle>
            <CardDescription>Scans per hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scanData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
