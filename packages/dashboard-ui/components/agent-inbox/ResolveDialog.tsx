"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";
import type { TeamWrapUpReport } from "@/lib/api/agent";

interface ResolveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (data: {
    category?: string;
    notes?: string;
    outcome?: string;
    wrapUpData?: Record<string, string>;
  }) => Promise<void>;
  contactName?: string;
  /** When set, use this team's wrap-up config (configurable fields). */
  wrapUpConfig?: TeamWrapUpReport | null;
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
  wrapUpConfig,
}: ResolveDialogProps) {
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const useTeamWrapUp = wrapUpConfig?.enabled === true;
  const fields = useTeamWrapUp ? (wrapUpConfig?.fields ?? []) : [];
  const mandatory = useTeamWrapUp && wrapUpConfig.mandatory === true;
  const categoryRequired = !useTeamWrapUp; // default form always requires category

  if (!isOpen) return null;

  const setFieldValue = (fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mandatory) {
      for (const f of fields) {
        if (f.required && !(formValues[f.id] ?? "").trim()) return;
      }
    }
    setIsSubmitting(true);
    try {
      await onResolve({ wrapUpData: { ...formValues } });
      setFormValues({});
      onClose();
    } catch (error) {
      console.error("Failed to resolve:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryRequired && !category.trim()) return;

    setIsSubmitting(true);
    try {
      await onResolve({
        category: category.trim(),
        notes: notes.trim() || undefined,
      });
      setCategory("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Failed to resolve:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipAndResolve = async () => {
    if (categoryRequired) return;
    setIsSubmitting(true);
    try {
      await onResolve({ category: "" });
      setCategory("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Failed to resolve:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipAndResolveCustom = async () => {
    if (mandatory) return;
    setIsSubmitting(true);
    try {
      await onResolve({ wrapUpData: {} });
      setFormValues({});
      onClose();
    } catch (error) {
      console.error("Failed to resolve:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitCustom =
    !mandatory ||
    fields.every((f) => !f.required || (formValues[f.id] ?? "").trim());

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
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
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

        {useTeamWrapUp ? (
          <form onSubmit={handleSubmitCustom} className="space-y-4">
            {fields.map((field) => (
              <div key={field.id}>
                <label
                  id={`resolve-${field.id}`}
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {field.label}{" "}
                  {field.required ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    "(Optional)"
                  )}
                </label>
                {field.type === "select" && (
                  <select
                    id={`resolve-select-${field.id}`}
                    value={formValues[field.id] ?? ""}
                    onChange={(e) => setFieldValue(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-labelledby={`resolve-${field.id}`}
                  >
                    <option value="">Select...</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === "text" && (
                  <input
                    id={`resolve-input-${field.id}`}
                    type="text"
                    value={formValues[field.id] ?? ""}
                    onChange={(e) => setFieldValue(field.id, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-labelledby={`resolve-${field.id}`}
                  />
                )}
                {field.type === "textarea" && (
                  <textarea
                    id={`resolve-textarea-${field.id}`}
                    value={formValues[field.id] ?? ""}
                    onChange={(e) => setFieldValue(field.id, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    aria-labelledby={`resolve-${field.id}`}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {!mandatory && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSkipAndResolveCustom}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Resolving..." : "Skip & Resolve"}
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canSubmitCustom || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Resolving..." : "Mark as Resolved"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitLegacy} className="space-y-4">
            <div>
              <label
                id="resolve-category-label"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Resolution Category{" "}
                {categoryRequired ? (
                  <span className="text-red-500">*</span>
                ) : (
                  "(Optional)"
                )}
              </label>
              <select
                id="resolve-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required={categoryRequired}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-labelledby="resolve-category-label"
              >
                <option value="">Select a category...</option>
                {RESOLUTION_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="flex justify-end gap-3 pt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {useTeamWrapUp && !mandatory && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSkipAndResolve}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Resolving..." : "Skip & Resolve"}
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  (categoryRequired && !category.trim()) || isSubmitting
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Resolving..." : "Mark as Resolved"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
