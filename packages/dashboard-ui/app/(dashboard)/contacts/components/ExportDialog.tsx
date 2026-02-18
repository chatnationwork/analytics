"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_COLUMNS = [
  { id: "contactId", label: "Phone Number" },
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "pin", label: "PIN / Tax ID" },
  { id: "yearOfBirth", label: "Year of Birth" },
  { id: "tags", label: "Tags" },
  { id: "paymentStatus", label: "Payment Status" },
  { id: "messageCount", label: "Message Count" },
  { id: "firstSeen", label: "First Seen" },
  { id: "lastSeen", label: "Last Seen" },
];

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((c) => c.id)
  );
  const [customMetadata, setCustomMetadata] = useState("");
  const [filterTags, setFilterTags] = useState("");

  const exportMutation = useMutation({
    mutationFn: async () => {
      // Parse custom metadata keys
      const metadataKeys = customMetadata
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => `metadata.${k}`);
      
      const columns = [...selectedColumns, ...metadataKeys];
      
      // Parse filter tags
      const tags = filterTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      return whatsappAnalyticsApi.exportContactsConfigured(
        columns,
        tags.length > 0 ? { tags } : undefined
      );
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Export successful");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to export contacts"),
  });

  const toggleColumn = (id: string) => {
    setSelectedColumns((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.id));
  const deselectAll = () => setSelectedColumns([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Contacts</DialogTitle>
          <DialogDescription>
            Select columns and filters for your CSV export.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Columns</Label>
              <div className="flex gap-2 text-xs">
                <button 
                  onClick={selectAll}
                  className="text-primary hover:underline hover:text-primary/80"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button 
                  onClick={deselectAll}
                  className="text-primary hover:underline hover:text-primary/80"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`col-${col.id}`} 
                    checked={selectedColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label 
                    htmlFor={`col-${col.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
               <Label htmlFor="customMetadata" className="text-sm text-muted-foreground">
                 Custom Metadata Keys (comma separated)
               </Label>
               <Input 
                 id="customMetadata"
                 placeholder="e.g. company, department, location"
                 value={customMetadata}
                 onChange={(e) => setCustomMetadata(e.target.value)}
                 className="h-8 text-sm"
               />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-medium">Filters (Optional)</Label>
            <div className="space-y-2">
               <Label htmlFor="filterTags" className="text-sm font-normal">
                 Filter by Tags (comma separated)
               </Label>
               <Input 
                 id="filterTags"
                 placeholder="e.g. vip, lead, active"
                 value={filterTags}
                 onChange={(e) => setFilterTags(e.target.value)}
               />
               <p className="text-xs text-muted-foreground">
                 Only export contacts that have AT LEAST ONE of these tags. Leave empty to export all.
               </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || (selectedColumns.length === 0 && !customMetadata)}
          >
            {exportMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
