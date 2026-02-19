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
import { AlertCircle, CheckCircle2, Tag, Database, Ban, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  { value: "yearOfBirth", label: "Year of Birth" },
  { value: "paymentStatus", label: "Payment Status" },
];

// Fuzzy matching for auto-suggest
const AUTO_MAPPING_RULES: Record<string, string[]> = {
  contactId: ["phone", "mobile", "cell", "whatsapp", "msisdn", "tel", "contact", "number"],
  name: ["name", "full name", "fullname", "customer", "client"],
  email: ["email", "e-mail", "mail"],
  yearOfBirth: ["birth", "dob", "yob", "age", "year"],
  tags: ["tag", "group", "segment", "label", "category", "status", "type", "source"],
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
        
        // 1. Check standard fields
        for (const [field, rules] of Object.entries(AUTO_MAPPING_RULES)) {
          // Skip 'tags' rule for field mapping, handle it as tag suggestion later
          if (field === 'tags') continue;
          
          if (rules.some((rule) => h.includes(rule))) {
            newMapping[header] = field;
            return; 
          }
        }

        // 2. Suggest as Tag if it looks like a category/group
        if (AUTO_MAPPING_RULES.tags.some(rule => h.includes(rule))) {
             newMapping[header] = `tags`; // Special marker for "import as tag with header name"
             // actually we store "tags:[header_slug]" or just "tags" 
             // Logic: if value[header] startswith "tag:", it's a tag.
        }
      });
      onChange(newMapping);
    }
  }, [csvHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModeChange = (header: string, mode: "field" | "tag" | "skip") => {
    const newMapping = { ...value };
    
    if (mode === "skip") {
      delete newMapping[header];
    } else if (mode === "tag") {
      // Default tag name is the header itself
      newMapping[header] = `tag:${header}`;
    } else {
      // Default field... try to guess or just pick first available?
      // better to leave empty or pick 'name' if not taken?
      // Let's set it to empty string which means "Field selected but not specified"?
      // Or just default to "name" for now
      newMapping[header] = "name";
    }
    onChange(newMapping);
  };

  const handleFieldChange = (header: string, field: string) => {
    const newMapping = { ...value };
    newMapping[header] = field;
    onChange(newMapping);
  };

  const handleTagChange = (header: string, tagName: string) => {
    const newMapping = { ...value };
    if (!tagName.trim()) {
       // If empty tag name, maybe revert to skip? or keep generic?
       // Let's keep generic prefix
       newMapping[header] = "tag:";
       onChange(newMapping);
       return;
    }
    newMapping[header] = `tag:${tagName}`;
    onChange(newMapping);
  };

  const getMode = (mappingValue?: string): "field" | "tag" | "skip" => {
    if (!mappingValue) return "skip";
    if (mappingValue.startsWith("tag:")) return "tag";
    if (mappingValue.startsWith("metadata.")) return "field"; // valid field for now (custom)
    return "field";
  };

  const getTagName = (mappingValue?: string) => {
     if (mappingValue?.startsWith("tag:")) return mappingValue.substring(4);
     return "";
  };
  
  // Check if required fields are mapped
  const hasPhone = Object.values(value).some((v) => v === "contactId");

  return (
    <div className="space-y-6">
      {!hasPhone && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm flex items-center gap-2 border border-amber-200 dark:border-amber-900">
          <AlertCircle className="w-4 h-4" />
          Please map a column to <strong>Phone (Required)</strong> to identify contacts.
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">CSV Column</TableHead>
              <TableHead className="w-[180px]">Action</TableHead>
              <TableHead className="w-[300px]">Destination</TableHead>
              <TableHead>Sample Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvHeaders.map((header, index) => {
              const mappedValue = value[header];
              const mode = getMode(mappedValue);
              
              return (
                <TableRow key={header}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono border">
                         {index + 1}
                       </div>
                       <span>{header}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tabs value={mode} onValueChange={(v) => handleModeChange(header, v as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 h-8 p-0 bg-muted/50">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TabsTrigger value="field" className="h-full text-xs px-1 data-[state=active]:bg-white dark:data-[state=active]:bg-muted data-[state=active]:shadow-sm">
                                <Database className="w-3.5 h-3.5 mr-1" /> Field
                              </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Map to a standard contact property</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <TabsTrigger value="tag" className="h-full text-xs px-1 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                                    <Tag className="w-3.5 h-3.5 mr-1" /> Tag
                                 </TabsTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Import as a searchable tag</p></TooltipContent>
                           </Tooltip>
                        </TooltipProvider>

                        <TabsTrigger value="skip" className="h-full text-xs px-1 text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:opacity-50">
                           <Ban className="w-3.5 h-3.5" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </TableCell>
                  <TableCell>
                    {mode === "skip" && (
                       <span className="text-muted-foreground text-sm italic pl-2">— Ignored —</span>
                    )}

                    {mode === "field" && (
                       <Select
                         value={mappedValue && mappedValue !== "skip" && !mappedValue.startsWith("tag:") ? mappedValue : ""}
                         onValueChange={(val) => handleFieldChange(header, val)}
                       >
                         <SelectTrigger className={mappedValue === "contactId" ? "border-amber-500 ring-amber-500 bg-amber-50/50" : ""}>
                           <SelectValue placeholder="Select field..." />
                         </SelectTrigger>
                         <SelectContent>
                           {AVAILABLE_FIELDS.map((f) => (
                             <SelectItem key={f.value} value={f.value}>
                               {f.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    )}

                    {mode === "tag" && (
                       <div className="flex items-center gap-2 animate-in fade-in duration-200">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Tag Name:</span>
                          <Input 
                            className="h-9" 
                            value={getTagName(mappedValue)}
                            onChange={(e) => handleTagChange(header, e.target.value)}
                            placeholder="Enter tag name (e.g. City)"
                            autoFocus
                          />
                       </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto">
                      {sampleRows.slice(0, 3).map((row, i) => (
                        <div key={i} className="flex items-center gap-2 truncate max-w-[300px]">
                           {mode === "tag" && (
                              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal tracking-wide text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200">
                                 {getTagName(mappedValue) || header}: {row[index]}
                              </Badge>
                           )}
                           {mode !== "tag" && row[index]}
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

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 p-4 rounded-lg flex items-start gap-3">
         <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
         <div className="space-y-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Why use Tags?</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
               Tags allow you to segment your contacts later. distinct from standard fields like Name or Email. 
               For example, importing a "Branch" column as a tag lets you easily send broadcasts to only "Westlands Branch" customers.
            </p>
         </div>
      </div>
    </div>
  );
}
