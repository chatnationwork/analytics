import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type ColumnMapping = Record<string, string>;

interface ColumnMapperProps {
  csvHeaders: string[];
  sampleRows: string[][];
  value: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

const AVAILABLE_FIELDS = [
  { value: "contactId", label: "Phone (Required)", required: true },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "pin", label: "PIN / Tax ID" },
  { value: "yearOfBirth", label: "Year of Birth" },
  { value: "tags", label: "Tags (Comma Separated)" },
  { value: "paymentStatus", label: "Payment Status" },
];

// Fuzzy matching for auto-suggest
const AUTO_MAPPING_RULES: Record<string, string[]> = {
  contactId: ["phone", "mobile", "cell", "whatsapp", "msisdn", "tel", "contact", "number"],
  name: ["name", "full name", "fullname", "customer", "client"],
  email: ["email", "e-mail", "mail"],
  pin: ["pin", "tax", "kra", "id number", "id"],
  yearOfBirth: ["birth", "dob", "yob", "age", "year"],
  tags: ["tag", "group", "segment", "label"],
  paymentStatus: ["payment", "status", "paid", "bill"],
};

export function ColumnMapper({
  csvHeaders,
  sampleRows,
  value,
  onChange,
}: ColumnMapperProps) {
  // Auto-map on first load if empty
  useEffect(() => {
    if (Object.keys(value).length === 0) {
      const newMapping: ColumnMapping = {};
      csvHeaders.forEach((header) => {
        const h = header.toLowerCase();
        // Check standard fields
        for (const [field, rules] of Object.entries(AUTO_MAPPING_RULES)) {
          if (rules.some((rule) => h.includes(rule))) {
            newMapping[header] = field;
            return;
          }
        }
        // Fallback: try to map to metadata if it looks like a custom field?
        // For now, leave unmapped (user can map manually)
      });
      onChange(newMapping);
    }
  }, [csvHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = (header: string, field: string) => {
    const newMapping = { ...value };
    if (field === "skip") {
      delete newMapping[header];
    } else {
      newMapping[header] = field;
    }
    onChange(newMapping);
  };

  const handleMetadataChange = (header: string, metadataKey: string) => {
    // metadata keys are stored as "metadata.key"
    if (!metadataKey.trim()) {
      const newMapping = { ...value };
      delete newMapping[header];
      onChange(newMapping);
      return;
    }
    const newMapping = { ...value, [header]: `metadata.${metadataKey}` };
    onChange(newMapping);
  };

  const isMetadata = (field: string) => field.startsWith("metadata.");
  const getMetadataKey = (field: string) =>
    field.startsWith("metadata.") ? field.replace("metadata.", "") : "";

  // Check if required fields are mapped
  const hasPhone = Object.values(value).some((v) => v === "contactId");

  return (
    <div className="space-y-4">
      {!hasPhone && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Please map a column to <strong>Phone (Required)</strong>.
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">CSV Column</TableHead>
              <TableHead className="w-[300px]">Maps To</TableHead>
              <TableHead>Sample Data (First 3 rows)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvHeaders.map((header, index) => {
              const mappedField = value[header] || "skip";
              const isCustom = isMetadata(mappedField);
              
              return (
                <TableRow key={header}>
                  <TableCell className="font-medium">
                    {header}
                    {mappedField !== "skip" && (
                       <CheckCircle2 className="w-3 h-3 text-green-600 inline ml-2" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Select
                        value={isCustom ? "metadata" : mappedField}
                        onValueChange={(val) => {
                          if (val === "metadata") {
                             // Default to header name slugified
                             handleMetadataChange(header, header.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                          } else {
                             handleFieldChange(header, val);
                          }
                        }}
                      >
                        <SelectTrigger className={mappedField === "contactId" ? "border-amber-500 ring-amber-500" : ""}>
                          <SelectValue placeholder="Skip column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip" className="text-muted-foreground">
                            — Skip —
                          </SelectItem>
                          {AVAILABLE_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="metadata">
                            Metadata (Custom Field)
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {isCustom && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 fade-in duration-200">
                           <span className="text-xs text-muted-foreground whitespace-nowrap">Key:</span>
                           <Input 
                             className="h-7 text-xs" 
                             value={getMetadataKey(mappedField)}
                             onChange={(e) => handleMetadataChange(header, e.target.value)}
                             placeholder="e.g. company_name"
                           />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto">
                      {sampleRows.slice(0, 3).map((row, i) => (
                        <div key={i} className="truncate max-w-[300px]">
                          {row[index]}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
