"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlaceholderSelectorProps {
  onInsert: (placeholder: string) => void;
}

export function PlaceholderSelector({ onInsert }: PlaceholderSelectorProps) {
  const [fallbackDialog, setFallbackDialog] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [fallbackValue, setFallbackValue] = useState("");

  const fields = [
    { key: "name", label: "Name" },
    // Use name as the key for contactId so it's clearer
    { key: "contactId", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "pin", label: "Tax ID (PIN)" },
    { key: "yearOfBirth", label: "Birth Year" },
    // System variables
    { key: "today", label: "Today's Date" },
    { key: "tomorrow", label: "Tomorrow's Date" },
    { key: "greeting", label: "Time Greeting" },
  ];

  const handleFieldClick = (field: { key: string; label: string }) => {
    setFallbackDialog(field);
    setFallbackValue("");
  };

  const handleInsert = () => {
    if (!fallbackDialog) return;

    const placeholder = fallbackValue.trim()
      ? `{{${fallbackDialog.key}|${fallbackValue.trim()}}}`
      : `{{${fallbackDialog.key}}}`;

    onInsert(placeholder);
    setFallbackDialog(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <Button
            key={field.key}
            variant="outline"
            size="sm"
            onClick={() => handleFieldClick(field)}
            className="h-7 text-xs bg-muted/50 hover:bg-muted"
          >
            <Plus className="mr-1 h-3 w-3" />
            {field.label}
          </Button>
        ))}
      </div>

      <Dialog open={!!fallbackDialog} onOpenChange={(open) => !open && setFallbackDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Insert Placeholder: {fallbackDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fallback">
                Fallback Value (Optional)
              </Label>
              <Input
                id="fallback"
                placeholder="e.g. Guest"
                value={fallbackValue}
                onChange={(e) => setFallbackValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsert();
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Value to use if the contact field is empty. Leave blank for no fallback.
              </p>
            </div>
            
            <div className="rounded-md bg-muted p-3 text-sm font-mono">
              Preview: {fallbackValue.trim() 
                ? `{{${fallbackDialog?.key}|${fallbackValue.trim()}}}` 
                : `{{${fallbackDialog?.key}}}`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFallbackDialog(null)}>Cancel</Button>
            <Button onClick={handleInsert}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
