
import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, TrendingUp, Activity, BarChart3, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

export default async function WhatsappPage() {
  const overview = await whatsappServerApi.getOverview().catch(() => null);
  
  // Default values to prevent crash if API fails
  const totalContacts = overview?.customerInsights?.totalContacts || 0;
  const conversionRate = overview?.engagement?.conversionRate || 0;
  const activeCampaigns = overview?.activeCampaigns || 0;
  const totalCampaigns = overview?.totalCampaigns || 0;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
           WhatsApp Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Real-time overview of your WhatsApp performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         
         {/* 1. Customer Insights (Contacts) */}
         <Link href="/whatsapp/customer-insights">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalContacts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        View Details &rarr;
                    </p>
                </CardContent>
            </Card>
         </Link>

         {/* 2. Engagement (Conversion) - No separate page anymore */}
         <Card className="h-full border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                    Replied / Delivered
                </p>
            </CardContent>
         </Card>

         {/* 3. Campaigns Summary */}
         <Link href="/whatsapp/campaign-optimization">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Active Campaigns</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeCampaigns} <span className="text-sm font-normal text-gray-400">/ {totalCampaigns}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">
                        View Analytics &rarr;
                    </p>
                </CardContent>
            </Card>
         </Link>

      </div>
    </div>
  );
}
