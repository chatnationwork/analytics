"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { eventsApi } from "@/lib/eos-events-api";
import { toast } from "sonner";

interface BulkCheckInModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkCheckInModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: BulkCheckInModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: any[];
  } | null>(null);

  const handleProcess = async () => {
    if (!jsonInput.trim()) return;

    let tickets: any[];
    try {
      tickets = JSON.parse(jsonInput);
      if (!Array.isArray(tickets)) {
        throw new Error("Input must be a JSON array");
      }
    } catch (e) {
      toast.error(`Invalid JSON: ${e.message}`);
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      const data = await eventsApi.bulkCheckIn(eventId, tickets);
      setResults(data);
      if (data.success > 0) {
        toast.success(`Successfully checked in ${data.success} tickets`);
        onSuccess();
      }
    } catch (e) {
      console.error("Bulk check-in failed", e);
      toast.error("Bulk check-in failed. Please check the console for details.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!results || results.errors.length === 0) return;
    const blob = new Blob([JSON.stringify(results.errors, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `check-in-errors-${eventId}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setJsonInput("");
    setResults(null);
    setProcessing(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Check-In via JSON</DialogTitle>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Paste a JSON array of ticket codes or objects with <code>ticketCode</code> and optional <code>checkedInAt</code> timestamps.
            </p>
            <div className="space-y-2">
              <Textarea
                placeholder='[ "CODE1", "CODE2" ] or [ { "ticketCode": "CODE1", "checkedInAt": "2024-03-20T10:00:00Z" } ]'
                className="font-mono text-xs min-h-[300px]"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.success}
                </div>
                <div className="text-xs text-green-600 uppercase font-semibold">
                  Success
                </div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {results.failed}
                </div>
                <div className="text-xs text-destructive uppercase font-semibold">
                  Failed
                </div>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Error Details
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-2"
                    onClick={handleDownloadErrors}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Error Log
                  </Button>
                </div>
                <div className="border rounded-md max-h-[200px] overflow-auto divide-y bg-muted/30">
                  {results.errors.map((err, idx) => (
                    <div key={idx} className="p-2 text-xs flex justify-between">
                      <code className="font-semibold">{err.ticketCode || "N/A"}</code>
                      <span className="text-destructive">{err.error || "Unknown error"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
              Processing complete. You can close this window or process more.
            </div>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="ghost" onClick={onClose} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleProcess} disabled={processing || !jsonInput.trim()}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Check-Ins"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={reset}>
                Process More
              </Button>
              <Button onClick={onClose}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
