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
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200"
      >
        Payment Pending
      </Badge>
    );
  }
  if (paymentStatus === "failed") {
    return (
      <Badge
        variant="destructive"
        className="bg-red-50 text-red-700 border-red-200"
      >
        Payment Failed
      </Badge>
    );
  }

  switch (status) {
    case "valid":
      return (
        <Badge
          variant="default"
          className="bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          Valid
        </Badge>
      );
    case "used":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          Checked In
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="destructive"
          className="bg-gray-50 text-gray-700 border-gray-200"
        >
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      );
  }
};
