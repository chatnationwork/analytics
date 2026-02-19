import { whatsappServerApi } from "@/lib/whatsapp-api-server";
import type { CampaignWithStats } from "@/lib/whatsapp-api";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CampaignAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = 20;

  const [overview, campaignsResponse] = await Promise.all([
    whatsappServerApi.getOverview().catch(() => null),
    whatsappServerApi.getCampaigns(page, limit).catch(() => ({ data: [], total: 0, page, limit })),
  ]);

  const campaigns = campaignsResponse.data ?? [];
  const total = campaignsResponse.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Funnel — derived from the flat overview shape
  const funnel = {
    sent: overview?.totalMessagesSent ?? 0,
    delivered: overview?.totalDelivered ?? 0,
    read: overview?.totalRead ?? 0,
    failed: overview?.totalFailed ?? 0,
  };

  // Top campaigns by read rate, derived from the current page's list
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.stats?.readRate ?? 0) - (a.stats?.readRate ?? 0))
    .slice(0, 5);

  const deliveryRate = overview?.avgDeliveryRate?.toFixed(1) ?? "0";
  const readRate = overview?.avgReadRate?.toFixed(1) ?? "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Campaign Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your WhatsApp campaign performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={(overview?.totalCampaigns ?? 0).toLocaleString()}
          change={`${overview?.activeCampaigns ?? 0} active`}
          positive={(overview?.activeCampaigns ?? 0) > 0}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Messages Sent"
          value={funnel.sent.toLocaleString()}
          change={`${deliveryRate}% delivery rate`}
          positive={parseFloat(deliveryRate) > 90}
          icon={<Send className="w-4 h-4" />}
        />
        <StatCard
          label="Read Rate"
          value={`${readRate}%`}
          change={`${funnel.read.toLocaleString()} read`}
          positive={parseFloat(readRate) > 50}
          icon={<CheckCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Failed"
          value={funnel.failed.toLocaleString()}
          change={
            funnel.sent > 0
              ? `${((funnel.failed / funnel.sent) * 100).toFixed(1)}% failure rate`
              : "No data"
          }
          positive={funnel.failed === 0}
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Delivery Funnel */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">Campaign Delivery Funnel</h3>
        <DeliveryFunnel funnel={funnel} />
      </div>

      {/* Top Campaigns */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">Top Performing Campaigns</h3>
        {topCampaigns.length > 0 ? (
          <div className="space-y-3">
            {topCampaigns.map((campaign, i) => (
              <div
                key={campaign.id}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                    i === 0
                      ? "bg-yellow-500/20 text-yellow-500"
                      : i === 1
                        ? "bg-gray-400/20 text-gray-400"
                        : i === 2
                          ? "bg-amber-600/20 text-amber-600"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{campaign.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {campaign.stats?.readRate?.toFixed(1) ?? "0"}% read rate
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-green-500 font-medium">
                    {(campaign.stats?.deliveryRate ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">delivery</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No campaign data available yet.
          </p>
        )}
      </div>

      {/* Campaigns Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="font-medium text-foreground">All Campaigns</h3>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Read</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Read Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No campaigns found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Showing {campaigns.length} of {total} campaigns
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild>
              <Link href={`/campaign-analytics?page=${page - 1}`} scroll={false}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
              <Link href={`/campaign-analytics?page=${page + 1}`} scroll={false}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  change,
  positive,
  icon,
  href,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div
      className={`bg-card rounded-xl border border-border p-5 shadow-sm ${
        href ? "hover:bg-accent/50 transition-colors cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div
        className={`text-sm flex items-center gap-1 ${
          positive ? "text-green-500" : "text-muted-foreground"
        }`}
      >
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function DeliveryFunnel({
  funnel,
}: {
  funnel: { sent: number; delivered: number; read: number; failed: number };
}) {
  const steps = [
    { name: "Sent", count: funnel.sent, color: "from-blue-500 to-blue-400" },
    { name: "Delivered", count: funnel.delivered, color: "from-purple-500 to-purple-400" },
    { name: "Read", count: funnel.read, color: "from-emerald-500 to-emerald-400" },
    { name: "Failed", count: funnel.failed, color: "from-red-500 to-red-400" },
  ] as const;
  const maxCount = funnel.sent || 1;

  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const widthPercent = (step.count / maxCount) * 100;
        const percent = Math.round(widthPercent);

        return (
          <div key={step.name}>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-foreground font-medium">{step.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{step.count.toLocaleString()}</span>
                <span className="text-foreground font-medium w-10 text-right">{percent}%</span>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className={`h-full bg-linear-to-r ${step.color} rounded-lg transition-all duration-700`}
                style={{ width: `${Math.max(widthPercent, step.count > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>
          Delivery:{" "}
          <span className="text-foreground font-medium">
            {funnel.sent > 0 ? Math.round((funnel.delivered / funnel.sent) * 100) : 0}%
          </span>
        </span>
        <span>
          Read:{" "}
          <span className="text-foreground font-medium">
            {funnel.delivered > 0 ? Math.round((funnel.read / funnel.delivered) * 100) : 0}%
          </span>
        </span>
        <span>
          Failed:{" "}
          <span className="text-foreground font-medium">
            {funnel.sent > 0 ? Math.round((funnel.failed / funnel.sent) * 100) : 0}%
          </span>
        </span>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500 text-white hover:bg-green-600 border-transparent",
  running: "bg-blue-500 text-white hover:bg-blue-600 border-transparent",
  active: "bg-blue-500 text-white hover:bg-blue-600 border-transparent",
  failed: "bg-red-500 text-white hover:bg-red-600 border-transparent",
  cancelled: "bg-red-500 text-white hover:bg-red-600 border-transparent",
  scheduled: "bg-amber-500 text-white hover:bg-amber-600 border-transparent",
};

function CampaignRow({ campaign }: { campaign: CampaignWithStats }) {
  const stats = campaign.stats;
  const statusStyle = STATUS_STYLES[campaign.status] ?? "bg-secondary text-secondary-foreground";

  return (
    <TableRow>
      <TableCell className="font-medium">{campaign.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(campaign.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>{campaign.recipientCount?.toLocaleString() ?? 0}</TableCell>
      <TableCell>
        <Badge className={statusStyle}>{campaign.status}</Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {(stats?.sent ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono">
        {(stats?.delivered ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono">
        {(stats?.read ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono text-red-500">
        {(stats?.failed ?? 0).toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono">
        {(stats?.readRate ?? 0).toFixed(1)}%
      </TableCell>
    </TableRow>
  );
}
