import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AudiencePreview } from "@/lib/broadcast-types";
import { Users, Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AudiencePreviewCardProps {
  preview: AudiencePreview | null;
  loading: boolean;
}

export function AudiencePreviewCard({ preview, loading }: AudiencePreviewCardProps) {
  if (loading) {
     return (
        <Card className="h-full">
           <CardHeader>
              <CardTitle>Audience Estimation</CardTitle>
              <CardDescription>Calculating matching contacts...</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="space-y-4 animate-pulse">
                 <div className="h-4 bg-muted rounded w-3/4"></div>
                 <div className="h-8 bg-muted rounded w-full"></div>
                 <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
           </CardContent>
        </Card>
     );
  }

  if (!preview) {
     return (
        <Card className="h-full border-dashed">
           <CardHeader>
              <CardTitle>Audience Estimation</CardTitle>
              <CardDescription>Configure filters to see audience size.</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p>No filters selected</p>
           </CardContent>
        </Card>
     );
  }

  const { total, inWindow, outOfWindow, quotaStatus } = preview;
  const inWindowPercent = total > 0 ? (inWindow / total) * 100 : 0;
  
  // Quota check
  const quotaRemaining = quotaStatus?.remaining ?? 999999;
  const isOverQuota = outOfWindow > quotaRemaining;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Audience Estimation</CardTitle>
        <CardDescription>Based on current filters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         {/* Total Count */}
         <div className="text-center">
            <div className="text-4xl font-bold">{total.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Recipients</div>
         </div>

         {/* Window Split */}
         <div className="space-y-2">
            <div className="flex justify-between text-sm">
               <span className="text-green-600 font-medium flex items-center gap-1">
                 <Users className="w-3 h-3" /> In-Window (Free)
               </span>
               <span className="font-bold">{inWindow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
               <span className="text-amber-600 font-medium flex items-center gap-1">
                 <Clock className="w-3 h-3" /> Out-of-Window (Tiered)
               </span>
               <span className="font-bold">{outOfWindow.toLocaleString()}</span>
            </div>
            <Progress value={inWindowPercent} className="h-2" />
         </div>

         {/* Quota Warning */}
         {isOverQuota && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
               <div>
                  <span className="font-semibold block">Quota Exceeded</span>
                  You only have {quotaRemaining.toLocaleString()} tier credits remaining today. {outOfWindow - quotaRemaining} contacts will not receive the message.
               </div>
            </div>
         )}
         
         {!isOverQuota && outOfWindow > 0 && (
             <div className="text-xs text-center text-muted-foreground">
                This campaign will use {outOfWindow.toLocaleString()} tier credits.
                <br />
                ({quotaRemaining.toLocaleString()} remaining today)
             </div>
         )}
      </CardContent>
    </Card>
  );
}
