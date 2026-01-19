import { whatsappServerApi } from '@/lib/whatsapp-api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function CustomerInsightsPage() {
  const overview = await whatsappServerApi.getOverview().catch(() => null);

  if (!overview) return <div>Error loading data</div>;

  const { customerInsights } = overview;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-500" /> Customer Insights
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Understand who your customers are and how they behave.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerInsights.totalContacts}</div>
            <Link href="/whatsapp/contacts" className="text-xs text-blue-500 hover:underline mt-2 block">
                View All Contacts &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>
      

    </div>
  );
}
