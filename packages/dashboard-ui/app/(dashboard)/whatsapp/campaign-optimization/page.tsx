import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, MessageCircle, ArrowUpRight } from 'lucide-react';
import WhatsappCharts from '../charts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function CampaignOptimizationPage() {
  const overview = await whatsappServerApi.getOverview().catch(() => null);
  const campaigns = await whatsappServerApi.getCampaigns(1, 50).catch(() => []); // Fetch more for the list

  if (!overview) return <div>Error loading data</div>;

  const { campaignOptimization } = overview;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-purple-500" /> Campaign Optimization
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Data-driven decisions on messaging strategy.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Delivery Funnel</CardTitle>
                <CardDescription>Aggregate performance of recent campaigns</CardDescription>
            </CardHeader>
            <CardContent>
                <WhatsappCharts data={[]} funnel={campaignOptimization.funnel} />
            </CardContent>
        </Card>

        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Best reply rates</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {campaignOptimization.topCampaigns.map((c, i) => (
                        <div key={i} className="flex items-center justify-between border-b last:border-0 border-gray-100 dark:border-gray-800 pb-2 last:pb-0">
                            <span className="font-medium">{c.name}</span>
                            <div className="text-right">
                                <div className="text-sm font-bold text-green-600">{c.replyRate.toFixed(1)}% Reply</div>
                                <div className="text-xs text-gray-500">{c.readRate.toFixed(1)}% Read</div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                 {campaigns.map((campaign) => (
                    <div key={campaign.campaign_id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-gray-100 dark:border-gray-800">
                       <div className="space-y-1">
                           <p className="font-medium leading-none">{campaign.name}</p>
                           <p className="text-sm text-muted-foreground capitalize">
                               Status: <span className={
                                   campaign.status === 'completed' ? 'text-green-600' :
                                   campaign.status === 'active' ? 'text-blue-600' :
                                   campaign.status === 'failed' ? 'text-red-600' :
                                   'text-gray-600'
                               }>{campaign.status}</span>
                               <span className="mx-2">•</span>
                               {new Date(campaign.created_at).toLocaleDateString()}
                           </p>
                       </div>
                       <div className="text-right">
                            <span className="text-sm font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                {campaign.total_recipients || 0} recipients
                            </span>
                       </div>
                    </div>
                 ))}
             </div>
          </CardContent>
      </Card>
    </div>
  );
}
