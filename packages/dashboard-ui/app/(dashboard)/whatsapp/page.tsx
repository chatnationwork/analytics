import { whatsappServerApi } from "@/lib/whatsapp-api-server";
import {
  MessageCircle,
  Target,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";

export default async function WhatsappPage() {
  const overview = await whatsappServerApi.getOverview().catch(() => null);
  const campaigns = await whatsappServerApi.getCampaigns(1, 10).catch(() => []);

  const activeCampaigns = overview?.activeCampaigns || 0;
  const totalCampaigns = overview?.totalCampaigns || 0;
  const funnel = overview?.campaignOptimization?.funnel || {
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
  };
  const topCampaigns = overview?.campaignOptimization?.topCampaigns || [];

  // Calculate rates
  const deliveryRate =
    funnel.sent > 0 ? ((funnel.delivered / funnel.sent) * 100).toFixed(1) : "0";
  const readRate =
    funnel.delivered > 0
      ? ((funnel.read / funnel.delivered) * 100).toFixed(1)
      : "0";
  const replyRate =
    funnel.read > 0 ? ((funnel.replied / funnel.read) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Campaign Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your WhatsApp campaign performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={totalCampaigns.toLocaleString()}
          change={`${activeCampaigns} active`}
          positive={activeCampaigns > 0}
          icon={<TrendingUp className="w-4 h-4" />}
          href="/whatsapp/campaigns"
        />
        <StatCard
          label="Messages Sent"
          value={funnel.sent.toLocaleString()}
          change={`${deliveryRate}% delivered`}
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
          label="Reply Rate"
          value={`${replyRate}%`}
          change={`${funnel.replied.toLocaleString()} replied`}
          positive={parseFloat(replyRate) > 20}
          icon={<MessageCircle className="w-4 h-4" />}
        />
      </div>

      {/* Delivery Funnel */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">
          Campaign Delivery Funnel
        </h3>
        <DeliveryFunnel funnel={funnel} />
      </div>

      {/* Campaign Leaderboard */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-foreground">
            Top Performing Campaigns
          </h3>
          <Link
            href="/whatsapp/campaigns"
            className="text-sm text-primary hover:underline"
          >
            View All →
          </Link>
        </div>

        {topCampaigns.length > 0 ? (
          <div className="space-y-3">
            {topCampaigns.slice(0, 5).map((campaign: any, i: number) => (
              <div
                key={i}
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
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {campaign.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {campaign.readRate?.toFixed(1) || 0}% read rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-500 font-medium">
                    {campaign.replyRate?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    reply rate
                  </div>
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

      {/* Recent Campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-foreground">Recent Campaigns</h3>
            <Link
              href="/whatsapp/campaigns"
              className="text-sm text-primary hover:underline"
            >
              Manage Campaigns →
            </Link>
          </div>
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign: any) => (
              <div
                key={campaign.campaign_id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {campaign.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span
                      className={
                        campaign.status === "completed"
                          ? "text-green-500"
                          : campaign.status === "active"
                            ? "text-blue-500"
                            : campaign.status === "failed"
                              ? "text-red-500"
                              : ""
                      }
                    >
                      {campaign.status}
                    </span>
                    {" • "}
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {campaign.total_recipients || 0} recipients
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
      className={`bg-card rounded-xl border border-border p-5 shadow-sm ${href ? "hover:bg-accent/50 transition-colors cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div
        className={`text-sm flex items-center gap-1 ${positive ? "text-green-500" : "text-muted-foreground"}`}
      >
        {positive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {change}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function DeliveryFunnel({
  funnel,
}: {
  funnel: { sent: number; delivered: number; read: number; replied: number };
}) {
  const steps = [
    { name: "Sent", count: funnel.sent, color: "from-blue-500 to-blue-400" },
    {
      name: "Delivered",
      count: funnel.delivered,
      color: "from-purple-500 to-purple-400",
    },
    {
      name: "Read",
      count: funnel.read,
      color: "from-emerald-500 to-emerald-400",
    },
    {
      name: "Replied",
      count: funnel.replied,
      color: "from-amber-500 to-amber-400",
    },
  ];
  const maxCount = steps[0].count || 1;

  return (
    <div className="space-y-4">
      {steps.map((step, i) => {
        const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
        const percent =
          maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;

        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-foreground font-medium">{step.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {step.count.toLocaleString()}
                </span>
                <span className="text-foreground font-medium">{percent}%</span>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${step.color} rounded-lg transition-all duration-700`}
                style={{ width: `${Math.max(widthPercent, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>
          Delivery:{" "}
          <span className="text-foreground">
            {funnel.sent > 0
              ? Math.round((funnel.delivered / funnel.sent) * 100)
              : 0}
            %
          </span>
        </span>
        <span>
          Read:{" "}
          <span className="text-foreground">
            {funnel.delivered > 0
              ? Math.round((funnel.read / funnel.delivered) * 100)
              : 0}
            %
          </span>
        </span>
        <span>
          Reply:{" "}
          <span className="text-foreground">
            {funnel.read > 0
              ? Math.round((funnel.replied / funnel.read) * 100)
              : 0}
            %
          </span>
        </span>
      </div>
    </div>
  );
}
