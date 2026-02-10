"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { agentApi } from "@/lib/api/agent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS_OPTIONS = [1, 3, 7, 14, 30] as const;

interface MassReengagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MassReengagementDialog({
  open,
  onOpenChange,
  onSuccess,
}: MassReengagementDialogProps) {
  const [mode, setMode] = useState<"days" | "range">("days");
  const [olderThanDays, setOlderThanDays] = useState<number>(7);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: countData, isFetching: isCountLoading } = useQuery({
    queryKey: [
      "reengage-expired-count",
      open,
      mode,
      olderThanDays,
      startDate,
      endDate,
    ],
    queryFn: () =>
      agentApi.getExpiredCountForReengage(
        olderThanDays,
        mode === "range" ? startDate : undefined,
        mode === "range" ? endDate : undefined,
      ),
    enabled: open,
  });

  const count = countData?.count ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0) return;

    setIsSubmitting(true);
    try {
      const { sent, errors } = await agentApi.bulkReengage(
        olderThanDays,
        mode === "range" ? startDate : undefined,
        mode === "range" ? endDate : undefined,
      );
      onOpenChange(false);
      onSuccess?.();
      if (sent > 0) {
        toast.success(`Re-engagement template sent to ${sent} chat(s)`);
      }
      if (errors.length > 0 && sent === 0) {
        toast.error(errors[0]?.message ?? "Failed to send re-engagement");
      } else if (errors.length > 0) {
        toast.warning(`${sent} sent; ${errors.length} failed`);
      }
      if (sent === 0 && errors.length === 0) {
        toast.info("No chats matched the selected criteria");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send re-engagement",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidRange =
    mode !== "range" || (startDate !== "" && endDate !== "" && startDate <= endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            Mass re-engagement
          </DialogTitle>
          <DialogDescription>
            Send re-engagement templates to assigned chats. Filter by inactivity
            duration or a specific date range.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("days")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "days"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive Duration
            </button>
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "range"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Date Range
            </button>
          </div>

          {mode === "days" ? (
            <div className="space-y-2">
              <Label>Messages expired for at least</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setOlderThanDays(days)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      olderThanDays === days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    {days} {days === 1 ? "day" : "days"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Filter by last activity date</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">From</span>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">To</span>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              {mode === "range" && startDate && endDate && startDate > endDate && (
                <p className="text-xs text-destructive">
                  Start date cannot be after end date.
                </p>
              )}
            </div>
          )}

          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {isCountLoading ? (
              "Counting…"
            ) : (
              <>
                <span className="font-medium text-foreground">{count}</span>{" "}
                chat(s) matched.
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                count === 0 || isSubmitting || isCountLoading || !isValidRange
              }
            >
              {isSubmitting ? "Sending…" : "Send re-engagement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
