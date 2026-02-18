import { Progress } from "@/components/ui/progress";
import { QuotaStatus } from "@/lib/broadcast-types";
import { AlertCircle } from "lucide-react";

interface QuotaBarProps {
  quota: QuotaStatus | null | undefined;
}

export function QuotaBar({ quota }: QuotaBarProps) {
  if (!quota) return null;

  const { businessSent24h, tierLimit, remaining, tier } = quota;
  const limit = tierLimit || 1000; // Default fallback if unlimited
  const percent = Math.min((businessSent24h / limit) * 100, 100);
  const isUnlimited = tierLimit === null;

  return (
    <div className="space-y-1.5 min-w-[200px]">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">24h Limit (Tier {tier})</span>
        <span className={remaining !== null && remaining < 100 ? "text-red-500 font-bold" : "text-muted-foreground"}>
          {isUnlimited ? (
            `${businessSent24h.toLocaleString()} sent`
          ) : (
            `${businessSent24h.toLocaleString()} / ${limit.toLocaleString()}`
          )}
        </span>
      </div>
      
      {isUnlimited ? (
        <div className="h-2 w-full bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
           <div className="h-full bg-green-500 w-full animate-pulse opacity-50" />
        </div>
      ) : (
        <Progress value={percent} className="h-2" indicatorClassName={percent > 90 ? "bg-red-500" : percent > 75 ? "bg-yellow-500" : "bg-blue-600"} />
      )}
      
      {remaining !== null && remaining <= 0 && (
         <div className="flex items-center gap-1 text-[10px] text-red-500">
           <AlertCircle className="w-3 h-3" />
           <span>Quota exhausted. Campaigns paused.</span>
         </div>
      )}
    </div>
  );
}
