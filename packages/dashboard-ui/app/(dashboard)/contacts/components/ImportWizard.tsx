"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { ColumnMapper, ColumnMapping } from "./ColumnMapper";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "map" | "options" | "uploading" | "success";

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [strategy, setStrategy] = useState<"first" | "last" | "reject">("last");
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount?: number;
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch saved templates
  const { data: templates } = useQuery({
    queryKey: ["import-mapping-templates"],
    queryFn: whatsappAnalyticsApi.getMappingTemplates,
    enabled: open,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!saveTemplateName.trim()) return;
      return whatsappAnalyticsApi.createMappingTemplate(
        saveTemplateName,
        mapping
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import-mapping-templates"] });
      toast.success("Mapping template saved");
    },
    onError: () => toast.error("Failed to save template"),
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file");
      
      // Save template if requested
      if (shouldSaveTemplate && saveTemplateName) {
        await saveTemplateMutation.mutateAsync();
      }

      // Transform mapping for backend:
      // The backend expects: 
      // 1. A mapping object for standard fields (colName -> fieldName)
      // 2. A separate way to handle tags? 
      // Wait, let's check whatsappAnalyticsApi.importContactsMapped signature.
      // If it only takes a mapping object, we might need to conform to what it expects 
      // OR update it to handle our new "tag:tagName" format.
      //
      // Assuming for now we pass the mapping as is, and the backend (or API wrapper) needs to handle it.
      // Let's look at `whatsappAnalyticsApi.importContactsMapped`.
      
      return whatsappAnalyticsApi.importContactsMapped(
        file,
        mapping,
        strategy
      );
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-analytics-contacts"] });
      // Show more detailed success message
      const tagCount = Object.values(mapping).filter(v => v.startsWith("tag:")).length;
      toast.success(`Imported ${data.importedCount} contacts successfully. ${tagCount > 0 ? `Applied ${tagCount} tags.` : ""}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Import failed");
      setStep("options"); // Go back to options on failure
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Parse headers client-side
    Papa.parse(selectedFile, {
      preview: 5, // Read first 5 lines for headers and preview
      complete: (results) => {
        if (results.meta.fields) {
          setFile(selectedFile);
          setCsvHeaders(results.meta.fields);
          // Sample rows based on data (array of objects or array of arrays depending on header setting)
          // Papa with header: true returns array of objects.
          // But here we want array of values for preview relative to headers.
          // Let's re-parse without header=true to get raw rows? Or just map.
          // actually results.data is array of objects if header is detected/true?
          // results.meta.fields suggests header was detected.
          
          // Let's rely on data. map values back.
          const rows = (results.data as any[]).map(row => 
            results.meta.fields!.map(field => row[field])
          );
          setSampleRows(rows as string[][]);
          setStep("map");
        } else {
          toast.error("Could not parse CSV headers. Please ensure the file has a header row.");
        }
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const loadTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setMapping(template.mapping);
      toast.info(`Loaded template: ${template.name}`);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setCsvHeaders([]);
    setSampleRows([]);
    setMapping({});
    setImportResult(null);
    setSaveTemplateName("");
    setShouldSaveTemplate(false);
  };

  const hasPhoneMapped = Object.values(mapping).includes("contactId");

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleReset();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import contacts."}
            {step === "map" && "Map CSV columns to contact fields."}
            {step === "options" && "Configure import options."}
            {step === "uploading" && "Importing contacts..."}
            {step === "success" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md space-y-4">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Drag and drop your CSV file here, or click to select.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Select CSV File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-medium">Column Mapping</h3>
               {templates && templates.length > 0 && (
                 <div className="flex items-center gap-2">
                   <Label className="text-xs">Load Template:</Label>
                   <Select onValueChange={loadTemplate}>
                     <SelectTrigger className="w-[180px] h-8 text-xs">
                       <SelectValue placeholder="Select template..." />
                     </SelectTrigger>
                     <SelectContent>
                       {templates.map((t) => (
                         <SelectItem key={t.id} value={t.id}>
                           {t.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
            </div>
            
            <ColumnMapper
              csvHeaders={csvHeaders}
              sampleRows={sampleRows}
              value={mapping}
              onChange={setMapping}
            />
          </div>
        )}

        {step === "options" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Duplicate Handling Strategy</Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as any)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="last" id="r1" />
                  <Label htmlFor="r1">Update existing (Overwrite)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first" id="r2" />
                  <Label htmlFor="r2">Skip existing (Keep original)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reject" id="r3" />
                  <Label htmlFor="r3">Reject duplicates (Fail import)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2">
                 <input 
                   type="checkbox" 
                   id="saveTemplate" 
                   className="rounded border-gray-300"
                   checked={shouldSaveTemplate}
                   onChange={(e) => setShouldSaveTemplate(e.target.checked)}
                 />
                 <Label htmlFor="saveTemplate">Save this mapping as a template</Label>
              </div>
              
              {shouldSaveTemplate && (
                <div className="pl-6">
                  <Input
                    placeholder="Template Name (e.g. Weekly Sales Import)"
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md text-sm">
               <p className="font-medium">Summary</p>
               <ul className="list-disc list-inside mt-2 text-muted-foreground">
                 <li>File: {file?.name}</li>
                 <li>Columns Mapped: {Object.keys(mapping).length} / {csvHeaders.length}</li>
                 <li>Strategy: {strategy === "last" ? "Update" : strategy === "first" ? "Skip" : "Reject"} Duplicates</li>
               </ul>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading and processing...</p>
            <Progress value={45} className="w-[60%]" /> 
          </div>
        )}

        {step === "success" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Import Successful</h3>
            <p className="text-center text-muted-foreground">
              Imported {importResult?.importedCount} contacts.<br/>
              {importResult?.skippedCount ? `${importResult.skippedCount} skipped.` : ""}
            </p>
          </div>
        )}

        <DialogFooter>
          {step !== "uploading" && step !== "success" && (
            <Button variant="outline" onClick={() => {
              if (step === "map") setStep("upload");
              else if (step === "options") setStep("map");
              else onOpenChange(false);
            }}>
              {step === "upload" ? "Cancel" : "Back"}
            </Button>
          )}
          
          {step === "map" && (
            <Button 
              onClick={() => setStep("options")}
              disabled={!hasPhoneMapped}
            >
              Next
            </Button>
          )}

          {step === "options" && (
            <Button
              onClick={() => {
                setStep("uploading");
                importMutation.mutate();
              }}
              disabled={importMutation.isPending || (shouldSaveTemplate && !saveTemplateName)}
            >
              {importMutation.isPending ? "Importing..." : "Start Import"}
            </Button>
          )}
          
          {step === "success" && (
             <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
