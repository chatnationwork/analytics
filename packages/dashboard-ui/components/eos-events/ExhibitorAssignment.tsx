"use client";

import React, { useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosExhibitor, EosEvent } from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExhibitorAssignmentProps {
  eventId: string;
  exhibitor: EosExhibitor;
  event: EosEvent;
  onUpdate: () => void;
}

export function ExhibitorAssignment({
  eventId,
  exhibitor,
  event,
  onUpdate,
}: ExhibitorAssignmentProps) {
  const [loading, setLoading] = useState(false);

  const slots = event.settings?.venue_map_config?.slots || [];
  const assignedSlot = slots.find((s) => s.id === exhibitor.slotId);

  const handleAssignSlot = async (slotId: string) => {
    setLoading(true);
    try {
      await eventsApi.updateExhibitor(exhibitor.id, eventId, {
        slotId: slotId === "none" ? undefined : slotId,
      } as any);
      toast.success("Slot assigned successfully");
      onUpdate();
    } catch (e) {
      console.error("Failed to assign slot", e);
      toast.error("Failed to assign slot");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryInvite = async () => {
    setLoading(true);
    try {
      await eventsApi.retryExhibitorInvite(eventId, exhibitor.id);
      toast.success("Invitation retry triggered");
      onUpdate();
    } catch (e) {
      console.error("Failed to retry invitation", e);
      toast.error("Failed to retry invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Select
            value={exhibitor.slotId || "none"}
            onValueChange={handleAssignSlot}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assign slot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Slot</SelectItem>
              {slots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.name} ({slot.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assignedSlot && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {assignedSlot.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {exhibitor.invitationStatus === "failed" ? (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Failed
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryInvite}
              disabled={loading}
              className="gap-1"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Retry
            </Button>
          </div>
        ) : (
          <Badge
            variant={
              exhibitor.invitationStatus === "sent" ? "default" : "secondary"
            }
          >
            {exhibitor.invitationStatus || "pending"}
          </Badge>
        )}
      </div>
    </div>
  );
}
