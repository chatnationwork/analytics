"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Loader2, FileSpreadsheet, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ColumnMapper, ColumnMapping } from "./ColumnMapper";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";
import { toast } from "sonner";

interface SegmentImportFlowProps {
  segmentName: string;
  onImportComplete: (importedCount: number) => void;
}

type Step = "upload" | "map" | "options" | "importing" | "success";

export function SegmentImportFlow({
  segmentName,
  onImportComplete,
}: SegmentImportFlowProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [strategy, setStrategy] = useState<"first" | "last" | "reject">("last");
  const [additionalTagsInput, setAdditionalTagsInput] = useState("");
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhoneMapped = Object.values(mapping).includes("contactId");

  const parseAdditionalTags = (input: string): string[] =>
    input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      preview: 5,
      complete: (results) => {
        if (results.meta.fields) {
          setFile(selectedFile);
          setCsvHeaders(results.meta.fields);
          const rows = (results.data as Record<string, string>[]).map((row) =>
            results.meta.fields!.map((field) => row[field])
          );
          setSampleRows(rows as string[][]);
          setStep("map");
        } else {
          toast.error(
            "Could not parse CSV headers. Please ensure the file has a header row."
          );
        }
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setStep("importing");
    try {
      const additionalTags = [
        segmentName,
        ...parseAdditionalTags(additionalTagsInput),
      ];
      const data = (await whatsappAnalyticsApi.importContactsMapped(
        file,
        mapping,
        strategy,
        additionalTags
      )) as { importedCount: number; skippedCount?: number };

      setImportResult(data);
      setStep("success");
      onImportComplete(data.importedCount);
      toast.success(
        `Imported ${data.importedCount} contacts and tagged with "${segmentName}".`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed"
      );
      setStep("options");
    }
  };

  if (step === "upload") {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg space-y-4">
        <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Upload a CSV with your contact list. You’ll map columns to our fields
          next — phone is required.
        </p>
        <Button
          variant="secondary"
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
          aria-label="Select CSV file to import contacts"
        />
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Map your CSV columns to contact fields. <strong>Phone is required</strong> —
          match the column that contains phone numbers.
        </p>
        <ColumnMapper
          csvHeaders={csvHeaders}
          sampleRows={sampleRows}
          value={mapping}
          onChange={setMapping}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep("upload");
              setFile(null);
              setCsvHeaders([]);
              setSampleRows([]);
              setMapping({});
            }}
          >
            Back
          </Button>
          <Button
            onClick={() => setStep("options")}
            disabled={!hasPhoneMapped}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  if (step === "options") {
    const additionalTags = parseAdditionalTags(additionalTagsInput);
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Duplicate Handling</Label>
          <RadioGroup
            value={strategy}
            onValueChange={(v) => setStrategy(v as "first" | "last" | "reject")}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="last" id="dup-last" />
              <Label htmlFor="dup-last" className="font-normal">
                Update existing (overwrite with new data)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="first" id="dup-first" />
              <Label htmlFor="dup-first" className="font-normal">
                Skip existing (keep original)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reject" id="dup-reject" />
              <Label htmlFor="dup-reject" className="font-normal">
                Reject duplicates (fail import)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-tags">
            Additional tags (optional, comma-separated)
          </Label>
          <Input
            id="additional-tags"
            value={additionalTagsInput}
            onChange={(e) => setAdditionalTagsInput(e.target.value)}
            placeholder="e.g. event-2024, vip, newsletter"
          />
          <p className="text-xs text-muted-foreground">
            All imported contacts will be tagged with &quot;{segmentName}&quot; plus these tags.
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-1">
          <p className="font-medium">Summary</p>
          <p className="text-muted-foreground">
            File: {file?.name} · Tags: {segmentName}
            {additionalTags.length > 0 && `, ${additionalTags.join(", ")}`}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep("map")}>
            Back
          </Button>
          <Button onClick={handleImport}>Import & Create Segment</Button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Importing contacts and creating segment…
        </p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold">Import complete</h3>
        <p className="text-center text-muted-foreground text-sm">
          Imported {importResult?.importedCount} contacts with tag &quot;{segmentName}&quot;.
          {importResult?.skippedCount
            ? ` ${importResult.skippedCount} skipped (duplicates).`
            : ""}
          <br />
          <span className="text-muted-foreground/80">
            Creating segment…
          </span>
        </p>
      </div>
    );
  }

  return null;
}
