import { CampaignMetrics } from "@/lib/broadcast-types";

interface DeliveryFunnelProps {
  metrics?: CampaignMetrics;
}

export function DeliveryFunnel({ metrics }: DeliveryFunnelProps) {
  if (!metrics) return null;

  const { sent, delivered, read, deliveryRate, readRate } = metrics;
  
  // Ensure we don't divide by zero and handle empty states
  const maxCount = sent || 1;
  
  const steps = [
    { label: "Sent", value: sent, color: "bg-blue-500", width: "100%" },
    { label: "Delivered", value: delivered, color: "bg-purple-500", width: `${Math.max((delivered / maxCount) * 100, 0)}%` },
    { label: "Read", value: read, color: "bg-emerald-500", width: `${Math.max((read / maxCount) * 100, 0)}%` },
  ];

  return (
    <div className="space-y-4">
      {steps.map((tier) => (
        <div key={tier.label} className="space-y-1">
          <div className="flex justify-between text-sm">
             <span className="font-medium text-muted-foreground">{tier.label}</span>
             <span className="font-bold">{tier.value.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${tier.color} rounded-full transition-all duration-500`} 
              style={{ width: tier.width }}
            />
          </div>
        </div>
      ))}
      
      <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
         <div className="text-center">
            <div className="text-xs text-muted-foreground">Delivery Rate</div>
            <div className="text-lg font-bold text-purple-600">{deliveryRate.toFixed(1)}%</div>
         </div>
         <div className="text-center border-l">
            <div className="text-xs text-muted-foreground">Read Rate</div>
            <div className="text-lg font-bold text-emerald-600">{readRate.toFixed(1)}%</div>
         </div>
      </div>
    </div>
  );
}
