import React from "react";
import { Badge } from "../ui/badge";

interface TicketStatusBadgeProps {
  status: "valid" | "used" | "cancelled" | "pending";
  paymentStatus: "pending" | "completed" | "failed";
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({
  status,
  paymentStatus,
}) => {
  if (paymentStatus === "pending") {
    return <Badge variant="outline">Payment Pending</Badge>;
  }
  if (paymentStatus === "failed") {
    return <Badge variant="destructive">Payment Failed</Badge>;
  }

  switch (status) {
    case "valid":
      return <Badge variant="default">Valid</Badge>;
    case "used":
      return <Badge variant="secondary">Used</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
