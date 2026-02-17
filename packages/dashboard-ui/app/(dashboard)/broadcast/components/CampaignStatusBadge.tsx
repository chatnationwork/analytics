import { Badge } from "@/components/ui/badge";
import { CampaignStatus } from "@/lib/broadcast-types";

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const styles: Record<CampaignStatus, string> = {
    draft: "bg-gray-100 text-gray-600 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-400 capitalize",
    scheduled: "bg-purple-100 text-purple-700 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-400 capitalize",
    running: "bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400 capitalize animate-pulse",
    paused: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-400 capitalize",
    completed: "bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400 capitalize",
    failed: "bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400 capitalize",
    cancelled: "bg-gray-100 text-gray-600 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-400 capitalize line-through",
  };

  return (
    <Badge variant="secondary" className={styles[status] || styles.draft}>
      {status}
    </Badge>
  );
}
