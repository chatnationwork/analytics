"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Megaphone, 
  Send, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignStatusBadge } from "./components/CampaignStatusBadge";
import { CampaignTypeBadge } from "./components/CampaignTypeBadge";
import { QuotaBar } from "./components/QuotaBar";
import { broadcastApi } from "@/lib/broadcast-api";
import { Campaign, CampaignOverview, QuotaStatus } from "@/lib/broadcast-types";
import { toast } from "sonner";

export default function BroadcastPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [overview, setOverview] = useState<CampaignOverview | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    try {
      setLoading(true);
      const [campaignsData, overviewData, quotaData] = await Promise.all([
        broadcastApi.listCampaigns(page, 20),
        broadcastApi.getOverview(),
        broadcastApi.getQuota()
      ]);

      setCampaigns(campaignsData.data);
      setTotal(campaignsData.total);
      setOverview(overviewData);
      setQuota(quotaData);
    } catch (error) {
      console.error("Failed to load broadcast data:", error);
      toast.error("Error loading data", {
        description: "Could not fetch campaign list. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCancelClick = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this campaign?")) return;
    try {
      await broadcastApi.cancelCampaign(id);
      toast.success("Campaign cancelled");
      loadData();
    } catch (error) {
       toast.error("Error", { description: "Failed to cancel campaign" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcasts</h1>
          <p className="text-muted-foreground">Manage your WhatsApp campaigns and announcements.</p>
        </div>
        <div className="flex items-center gap-3">
           {quota && (
             <div className="hidden md:block bg-card px-3 py-1.5 rounded-lg border shadow-sm max-w-[250px]">
                <QuotaBar quota={quota} />
             </div>
           )}
           <Button asChild>
            <Link href="/broadcast/new">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Total Campaigns" 
          value={overview?.totalCampaigns.toLocaleString() ?? "-"} 
          icon={Megaphone} 
          description={overview ? `${overview.activeCampaigns} active` : undefined} 
        />
        <StatsCard 
          label="Messages Sent" 
          value={overview?.totalMessagesSent.toLocaleString() ?? "-"} 
          icon={Send} 
        />
        <StatsCard 
          label="Avg. Delivery Rate" 
          value={overview ? `${overview.avgDeliveryRate.toFixed(1)}%` : "-"} 
          icon={CheckCircle} 
        />
        <StatsCard 
          label="Avg. Read Rate" 
          value={overview ? `${overview.avgReadRate.toFixed(1)}%` : "-"} 
          icon={CheckCircle} 
        />
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>View and manage all your messaging campaigns</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">Loading campaigns...</TableCell>
                  </TableRow>
                ) : campaigns.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No campaigns found. Create your first one!</TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="group">
                      <TableCell className="font-medium">
                        <Link href={`/broadcast/${campaign.id}`} className="hover:underline flex items-center gap-2">
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <CampaignTypeBadge type={campaign.type} />
                      </TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell>
                        {campaign.recipientCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/broadcast/${campaign.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            {['draft', 'scheduled', 'running'].includes(campaign.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleCancelClick(campaign.id)}
                                >
                                  Cancel Campaign
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {total > 20 && (
            <div className="flex items-center justify-end space-x-2 py-4">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1 || loading}
               >
                 Previous
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setPage(p => p + 1)}
                 disabled={page * 20 >= total || loading}
               >
                 Next
               </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, description }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
           <div className="text-2xl font-bold">{value}</div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
