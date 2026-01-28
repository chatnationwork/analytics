"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

interface ResolveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (data: {
    category: string;
    notes?: string;
    outcome?: string;
  }) => Promise<void>;
  contactName?: string;
}

const RESOLUTION_CATEGORIES = [
  { value: "inquiry_answered", label: "Inquiry Answered" },
  { value: "issue_resolved", label: "Issue Resolved" },
  { value: "order_completed", label: "Order Completed" },
  { value: "complaint_addressed", label: "Complaint Addressed" },
  { value: "no_response", label: "No Response from User" },
  { value: "spam", label: "Spam / Irrelevant" },
  { value: "other", label: "Other" },
];

export function ResolveDialog({
  isOpen,
  onClose,
  onResolve,
  contactName,
}: ResolveDialogProps) {
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    setIsSubmitting(true);
    try {
      await onResolve({ category, notes: notes || undefined });
      setCategory("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Failed to resolve:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Mark as Resolved
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {contactName && (
          <p className="text-sm text-muted-foreground mb-4">
            Resolving chat with{" "}
            <span className="font-medium text-foreground">{contactName}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Resolution Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a category...</option>
              {RESOLUTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!category || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
