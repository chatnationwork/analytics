import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const page = Number((await searchParams).page) || 1;
  const limit = 20;

  const campaigns = await whatsappServerApi.getCampaigns(page, limit).catch(() => []);

  // Simple next page check (if we got full limit, assume there is more)
  const hasMore = campaigns.length === limit;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/whatsapp">
           <Button variant="ghost" size="icon">
             <ArrowLeft className="h-4 w-4" />
           </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            All Campaigns
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and manage all your messaging campaigns.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign List</CardTitle>
          <CardDescription>Page {page}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {campaigns.length === 0 ? (
                 <p className="text-center py-8 text-gray-500">No campaigns found.</p>
             ) : (
                 campaigns.map((campaign) => (
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
                 ))
             )}
          </div>

          <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
             <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                asChild
             >
                <Link href={`/whatsapp/campaigns?page=${page - 1}`}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                </Link>
             </Button>
             
             <Button 
                variant="outline" 
                size="sm"
                disabled={!hasMore}
                asChild
             >
                 <Link href={`/whatsapp/campaigns?page=${page + 1}`}>
                    Next <ChevronRight className="h-4 w-4 ml-2" />
                 </Link>
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
