"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  RefreshCw,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CampaignStatusBadge } from "../components/CampaignStatusBadge";
import { CampaignTypeBadge } from "../components/CampaignTypeBadge";
import { DeliveryFunnel } from "../components/DeliveryFunnel";
import { broadcastApi } from "@/lib/broadcast-api";
import {
  Campaign,
  CampaignMetrics,
  CampaignMessage,
  CampaignError,
} from "@/lib/broadcast-types";

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [errors, setErrors] = useState<CampaignError[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotal, setMsgTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

  // Poll for updates if running
  useEffect(() => {
    if (campaign && ["running", "queued"].includes(campaign.status)) {
      const interval = setInterval(() => {
        refreshMetrics();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status]);

  async function loadData() {
    try {
      setLoading(true);
      const [camp, met, msgs, errs] = await Promise.all([
        broadcastApi.getCampaign(id),
        broadcastApi.getCampaignMetrics(id),
        broadcastApi.getCampaignMessages(id, 1, 50),
        broadcastApi.getCampaignErrors(id),
      ]);

      setCampaign(camp);
      setMetrics(met);
      setMessages(msgs.data);
      setMsgTotal(msgs.total);
      setErrors(errs);
    } catch (error) {
      console.error("Failed to load campaign:", error);
      toast.error("Error", { description: "Could not load campaign details" });
    } finally {
      setLoading(false);
    }
  }

  async function refreshMetrics() {
    setRefreshing(true);
    try {
      const [met, msgs, camp] = await Promise.all([
        broadcastApi.getCampaignMetrics(id),
        broadcastApi.getCampaignMessages(id, msgPage, 50),
        broadcastApi.getCampaign(id),
      ]);
      setMetrics(met);
      setMessages(msgs.data);
      setMsgTotal(msgs.total);
      setCampaign(camp); // Status might change
    } finally {
      setRefreshing(false);
    }
  }

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to stop this campaign? Pending messages will satisfy quota but won't be sent.",
      )
    )
      return;
    try {
      await broadcastApi.cancelCampaign(id);
      toast.success("Campaign Cancelled");
      loadData();
    } catch (error) {
      toast.error("Error", { description: "Failed to cancel" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-xl font-semibold">Campaign not found</h2>
        <Button asChild variant="outline">
          <Link href="/broadcast">Return to List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/broadcast">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
              <CampaignTypeBadge type={campaign.type} />
            </div>
            <p className="text-muted-foreground flex items-center gap-4 text-sm mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Created{" "}
                {new Date(campaign.createdAt).toLocaleString()}
              </span>
              {campaign.scheduledAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Scheduled for{" "}
                  {new Date(campaign.scheduledAt).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {["running", "scheduled", "queued"].includes(campaign.status) && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <Ban className="w-4 h-4 mr-2" />
              Stop Campaign
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Config */}
        <div className="md:col-span-2 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Total
                </div>
                <div className="text-2xl font-bold">
                  {metrics?.total.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Delivered
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics?.delivered.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Read
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {metrics?.read.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Failed
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.failed.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Details */}
          <Tabs defaultValue="funnel">
            <TabsList>
              <TabsTrigger value="funnel">Delivery Analytics</TabsTrigger>
              <TabsTrigger value="messages">Message Log</TabsTrigger>
              {errors.length > 0 && (
                <TabsTrigger value="errors" className="text-red-500">
                  Errors ({errors.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="funnel" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Funnel</CardTitle>
                  <CardDescription>
                    Visual breakdown of message delivery status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeliveryFunnel metrics={metrics || undefined} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-mono">
                            {msg.recipientPhone}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                msg.status === "read"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : msg.status === "failed"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : msg.status === "delivered"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : ""
                              }
                            >
                              {msg.status}
                            </Badge>
                            {msg.errorMessage && (
                              <div className="text-xs text-red-500 mt-1">
                                {msg.errorMessage}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {msg.deliveredAt
                              ? new Date(msg.deliveredAt).toLocaleTimeString()
                              : msg.sentAt
                                ? new Date(msg.sentAt).toLocaleTimeString()
                                : new Date(msg.createdAt).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {msgTotal > messages.length && (
                    <div className="p-4 text-center border-t">
                      <Button variant="ghost" size="sm">
                        View All Messages
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              <div className="space-y-2">
                {errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <div className="font-medium text-red-900 dark:text-red-400">
                        {err.errorCode}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        {err.errorMessage}
                      </div>
                    </div>
                    <Badge variant="destructive">{err.count} failures</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Campaign Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">
                  Audience Filter
                </div>
                <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                  {JSON.stringify(
                    campaign.audienceFilter || "All Contacts",
                    null,
                    2,
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">
                  Message Template
                </div>
                <div className="bg-muted p-2 rounded text-xs">
                  {campaign.messageTemplate.text?.body ||
                    campaign.messageTemplate.template?.name ||
                    "Complex Template"}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Created By</span>
                  <span>{campaign.createdBy || "System"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {campaign.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
