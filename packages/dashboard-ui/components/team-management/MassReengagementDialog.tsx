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
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { agentApi } from "@/lib/api/agent";

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
  const [olderThanDays, setOlderThanDays] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: countData, isFetching: isCountLoading } = useQuery({
    queryKey: ["reengage-expired-count", open, olderThanDays],
    queryFn: () => agentApi.getExpiredCountForReengage(olderThanDays),
    enabled: open,
  });

  const count = countData?.count ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count === 0) return;

    setIsSubmitting(true);
    try {
      const { sent, errors } = await agentApi.bulkReengage(olderThanDays);
      onOpenChange(false);
      onSuccess?.();
      if (sent > 0) {
        toast.success(
          `Re-engagement template sent to ${sent} chat(s)`,
        );
      }
      if (errors.length > 0 && sent === 0) {
        toast.error(errors[0]?.message ?? "Failed to send re-engagement");
      } else if (errors.length > 0) {
        toast.warning(
          `${sent} sent; ${errors.length} failed`,
        );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            Mass re-engagement
          </DialogTitle>
          <DialogDescription>
            Send the re-engagement template to assigned chats that have had no
            activity for at least the selected number of days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Messages expired for at least
            </label>
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

          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {isCountLoading ? (
              "Counting…"
            ) : (
              <>
                <span className="font-medium text-foreground">{count}</span>{" "}
                chat(s) will receive the re-engagement template.
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
              disabled={count === 0 || isSubmitting || isCountLoading}
            >
              {isSubmitting ? "Sending…" : "Send re-engagement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
