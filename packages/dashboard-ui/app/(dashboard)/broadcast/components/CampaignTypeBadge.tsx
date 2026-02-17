import { Badge } from "@/components/ui/badge";
import { CampaignType } from "@/lib/broadcast-types";
import { Calendar, Zap, PlayCircle, Server } from "lucide-react";

interface CampaignTypeBadgeProps {
  type: CampaignType;
}

export function CampaignTypeBadge({ type }: CampaignTypeBadgeProps) {
  const config: Record<CampaignType, { label: string; icon: any }> = {
    manual: { label: "Manual", icon: PlayCircle },
    scheduled: { label: "Scheduled", icon: Calendar },
    event_triggered: { label: "Event Triggered", icon: Zap },
    module_initiated: { label: "System", icon: Server },
  };

  const { label, icon: Icon } = config[type] || config.manual;

  return (
    <Badge variant="outline" className="gap-1 pl-1.5 pr-2.5 py-0.5 font-normal text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
