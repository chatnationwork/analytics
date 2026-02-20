"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Megaphone,
  Send,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Calendar,
  RotateCcw,
  Copy,
  Bookmark,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStatusBadge } from "./components/CampaignStatusBadge";
import { CampaignTypeBadge } from "./components/CampaignTypeBadge";
import { QuotaBar } from "./components/QuotaBar";
import { CalendarView } from "@/components/CalendarView";
import { broadcastApi, CampaignListParams } from "@/lib/broadcast-api";
import { Campaign, CampaignOverview, QuotaStatus } from "@/lib/broadcast-types";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "__all__", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function BroadcastPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [overview, setOverview] = useState<CampaignOverview | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CampaignListParams>({});
  const [searchInput, setSearchInput] = useState("");
  const [createFromSavedOpen, setCreateFromSavedOpen] = useState(false);
  const [savedCampaigns, setSavedCampaigns] = useState<Campaign[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: CampaignListParams = {
        ...filters,
        page,
        limit,
      };
      const [campaignsData, overviewData, quotaData] = await Promise.all([
        broadcastApi.listCampaigns(page, limit, params),
        broadcastApi.getOverview(),
        broadcastApi.getQuota(),
      ]);

      setCampaigns(campaignsData.data);
      setTotal(campaignsData.total);
      setOverview(overviewData);
      setQuota(quotaData);
    } catch (error) {
      console.error("Failed to load broadcast data:", error);
      toast.error("Error loading data", {
        description: "Could not fetch campaign list. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (updates: Partial<CampaignListParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange({ search: searchInput.trim() || undefined });
  };

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

  const handleDuplicateClick = async (campaign: Campaign) => {
    try {
      const duplicated = await broadcastApi.duplicateCampaign(campaign.id);
      toast.success("Campaign duplicated");
      loadData();
      return duplicated;
    } catch (error) {
      toast.error("Error", { description: "Failed to duplicate campaign" });
      return null;
    }
  };

  const handleRerunClick = async (id: string) => {
    try {
      await broadcastApi.rerunCampaign(id);
      toast.success("Campaign rerun started");
      loadData();
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to rerun campaign",
      });
    }
  };

  const handleSaveAsTemplate = async (campaign: Campaign) => {
    try {
      await broadcastApi.duplicateCampaign(campaign.id, { asTemplate: true });
      toast.success("Saved as template");
      loadData();
    } catch (error) {
      toast.error("Error", { description: "Failed to save as template" });
    }
  };

  const openCreateFromSaved = async () => {
    setCreateFromSavedOpen(true);
    setSavedLoading(true);
    try {
      const res = await broadcastApi.listCampaigns(1, 50, {
        status: undefined,
        isTemplate: true,
      });
      setSavedCampaigns(res.data);
      if (res.data.length === 0) {
        const completed = await broadcastApi.listCampaigns(1, 50, {
          status: "completed",
        });
        setSavedCampaigns(completed.data);
      }
    } catch {
      setSavedCampaigns([]);
    } finally {
      setSavedLoading(false);
    }
  };

  const handleCreateFromSaved = async (campaign: Campaign) => {
    try {
      const duplicated = await broadcastApi.duplicateCampaign(campaign.id);
      setCreateFromSavedOpen(false);
      window.location.href = `/broadcast/${duplicated.id}`;
    } catch (error) {
      toast.error("Error", { description: "Failed to create from saved campaign" });
    }
  };

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcasts</h1>
          <p className="text-muted-foreground">
            Manage your WhatsApp campaigns and announcements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {quota && (
            <div className="hidden md:block bg-card px-3 py-1.5 rounded-lg border shadow-sm max-w-[250px]">
              <QuotaBar quota={quota} />
            </div>
          )}
          <Button variant="outline" onClick={openCreateFromSaved} asChild={false}>
            <BookmarkPlus className="w-4 h-4 mr-2" />
            From Saved
          </Button>
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
          description={
            overview ? `${overview.activeCampaigns} active` : undefined
          }
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

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>
                  View and manage all your messaging campaigns
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex gap-2 flex-1"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Search
                  </Button>
                </form>
                <Select
                  value={filters.status ?? "__all__"}
                  onValueChange={(v) =>
                    handleFilterChange({
                      status: v === "__all__" ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center"
                        >
                          Loading campaigns...
                        </TableCell>
                      </TableRow>
                    ) : campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No campaigns found. Create your first one!
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id} className="group">
                          <TableCell className="font-medium">
                            <Link
                              href={`/broadcast/${campaign.id}`}
                              className="hover:underline flex items-center gap-2"
                            >
                              {campaign.name}
                              {campaign.isTemplate && (
                                <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
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
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/broadcast/${campaign.id}`}>
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateClick(campaign)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                {["completed", "failed"].includes(
                                  campaign.status
                                ) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRerunClick(campaign.id)
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Rerun Campaign
                                  </DropdownMenuItem>
                                )}
                                {!campaign.isTemplate && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleSaveAsTemplate(campaign)
                                    }
                                  >
                                    <Bookmark className="h-4 w-4 mr-2" />
                                    Save as template
                                  </DropdownMenuItem>
                                )}
                                {["draft", "scheduled", "running"].includes(
                                  campaign.status
                                ) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() =>
                                        handleCancelClick(campaign.id)
                                      }
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

              {/* Pagination */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Showing {startItem}-{endItem} of {total}
                    </span>
                    <Select
                      value={String(limit)}
                      onValueChange={(v) => {
                        setLimit(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[100px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} per page
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages || loading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView
            loadItemsForRange={async (from, to) => {
              const res = await broadcastApi.listCampaigns(1, 500, {
                dateFrom: from,
                dateTo: to,
              });
              return res.data.map((c) => {
                const date =
                  c.startedAt ?? c.scheduledAt ?? c.createdAt;
                const recipients =
                  c.recipientCount > 0
                    ? c.recipientCount >= 1000
                      ? `${(c.recipientCount / 1000).toFixed(1)}k recipients`
                      : `${c.recipientCount} recipients`
                    : null;
                return {
                  id: c.id,
                  title: c.name,
                  date: date as string,
                  href: `/broadcast/${c.id}`,
                  status: c.status,
                  subtitle: recipients ?? undefined,
                  meta:
                    c.startedAt && c.completedAt
                      ? `Ran ${new Date(c.startedAt).toLocaleTimeString()} – ${new Date(c.completedAt).toLocaleTimeString()}`
                      : c.scheduledAt
                        ? `Scheduled for ${new Date(c.scheduledAt).toLocaleString()}`
                        : undefined,
                };
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Create from saved dialog */}
      <Dialog open={createFromSavedOpen} onOpenChange={setCreateFromSavedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from saved campaign</DialogTitle>
            <DialogDescription>
              Choose a saved or completed campaign to use as a starting point.
              A new draft will be created for you to edit and send.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {savedLoading ? (
              <p className="text-sm text-muted-foreground py-4">
                Loading...
              </p>
            ) : savedCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No saved or completed campaigns found.
              </p>
            ) : (
              <div className="space-y-2">
                {savedCampaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCreateFromSaved(c)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium">{c.name}</span>
                    <CampaignStatusBadge status={c.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateFromSavedOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
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
