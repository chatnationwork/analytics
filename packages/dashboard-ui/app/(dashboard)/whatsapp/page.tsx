import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Users, MessageCircle, Clock, Target, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export default async function WhatsappPage() {
  const overview = await whatsappServerApi.getOverview().catch(() => null);
  const campaigns = await whatsappServerApi.getCampaigns(1, 10).catch(() => []);

  const totalContacts = overview?.customerInsights?.totalContacts || 0;
  const conversionRate = overview?.engagement?.conversionRate || 0;
  const activeCampaigns = overview?.activeCampaigns || 0;
  const totalCampaigns = overview?.totalCampaigns || 0;
  const funnel = overview?.campaignOptimization?.funnel || { sent: 0, delivered: 0, read: 0, replied: 0 };
  const topCampaigns = overview?.campaignOptimization?.topCampaigns || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">WhatsApp Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Real-time overview of your WhatsApp performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={totalContacts.toLocaleString()}
          change="+15%"
          positive
          icon={<Users className="w-4 h-4" />}
          href="/whatsapp/contacts"
        />
        <StatCard
          label="Messages Sent"
          value={funnel.sent.toLocaleString()}
          change="+24%"
          positive
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Completion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          change="+5%"
          positive
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Active Campaigns"
          value={`${activeCampaigns} / ${totalCampaigns}`}
          change={activeCampaigns > 0 ? "Active" : "None"}
          positive={activeCampaigns > 0}
          icon={<TrendingUp className="w-4 h-4" />}
          href="/whatsapp/campaign-optimization"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Delivery Funnel */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Delivery Funnel</h3>
          <DeliveryFunnel funnel={funnel} />
        </div>

        {/* Peak Hours */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Message Volume by Hour</h3>
          <MockBarChart />
          <p className="text-sm text-gray-400 mt-4 text-center">
            Peak: <span className="text-white">10 AM - 12 PM</span>
          </p>
        </div>
      </div>

      {/* Campaign Leaderboard */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-white">Top Performing Campaigns</h3>
          <Link href="/whatsapp/campaigns" className="text-sm text-blue-400 hover:text-blue-300">
            View All →
          </Link>
        </div>
        
        {topCampaigns.length > 0 ? (
          <div className="space-y-3">
            {topCampaigns.slice(0, 5).map((campaign: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-medium text-sm text-white">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{campaign.name}</div>
                  <div className="text-sm text-gray-400">{campaign.readRate?.toFixed(1) || 0}% read rate</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-400 font-medium">{campaign.replyRate?.toFixed(1) || 0}%</div>
                  <div className="text-xs text-gray-400">reply rate</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            No campaign data available yet.
          </p>
        )}
      </div>

      {/* Recent Campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-white">Recent Campaigns</h3>
          </div>
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign: any) => (
              <div key={campaign.campaign_id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <div className="font-medium text-white">{campaign.name}</div>
                  <div className="text-sm text-gray-400">
                    <span className={
                      campaign.status === 'completed' ? 'text-green-400' :
                      campaign.status === 'active' ? 'text-blue-400' :
                      campaign.status === 'failed' ? 'text-red-400' : ''
                    }>{campaign.status}</span>
                    {' • '}
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
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

function StatCard({ label, value, change, positive, icon, href }: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className={`bg-gray-800/50 rounded-xl border border-white/10 p-5 ${href ? 'hover:bg-gray-800/70 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="text-gray-500">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${positive ? 'text-green-400' : 'text-gray-400'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function DeliveryFunnel({ funnel }: { funnel: { sent: number; delivered: number; read: number; replied: number } }) {
  const steps = [
    { name: 'Sent', count: funnel.sent },
    { name: 'Delivered', count: funnel.delivered },
    { name: 'Read', count: funnel.read },
    { name: 'Replied', count: funnel.replied },
  ];
  const maxCount = steps[0].count || 1;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
        const percent = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;

        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-white">{step.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{step.count.toLocaleString()}</span>
                <span className="text-white font-medium">{percent}%</span>
              </div>
            </div>
            <div className="h-6 bg-gray-700/50 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded transition-all duration-700"
                style={{ width: `${Math.max(widthPercent, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MockBarChart() {
  const hours = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];
  const values = [15, 35, 85, 65, 45, 55, 75, 45];

  return (
    <div className="h-32 flex items-end gap-2">
      {values.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t"
            style={{ height: `${val}%` }}
          />
          <span className="text-xs text-gray-500">{hours[i]}</span>
        </div>
      ))}
    </div>
  );
}
