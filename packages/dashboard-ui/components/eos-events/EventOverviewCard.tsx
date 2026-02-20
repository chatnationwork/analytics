import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Ticket, DollarSign, Store, UserCheck } from "lucide-react";
import { EosEventMetrics } from "../../types/eos-events";

interface EventOverviewCardProps {
  metrics: EosEventMetrics;
}

interface MetricItemProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </CardContent>
  </Card>
);

export const EventOverviewCard: React.FC<EventOverviewCardProps> = ({
  metrics,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const attendanceRate = metrics.totalTickets > 0
    ? ((metrics.checkIns / metrics.totalTickets) * 100).toFixed(1)
    : "0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricItem
        title="Total Tickets"
        value={metrics.totalTickets.toLocaleString()}
        icon={Ticket}
      />
      <MetricItem
        title="Revenue"
        value={formatCurrency(metrics.totalRevenue)}
        icon={DollarSign}
      />
      <MetricItem
        title="Exhibitors"
        value={metrics.totalExhibitors.toLocaleString()}
        icon={Store}
      />
      <MetricItem
        title="Check-ins"
        value={metrics.checkIns.toLocaleString()}
        icon={UserCheck}
        subtext={`${attendanceRate}% attendance`}
      />
    </div>
  );
};
