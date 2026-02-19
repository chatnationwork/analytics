"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { templatesApi } from "@/lib/templates-api";
import { Plus, Code, Eye } from "lucide-react";

interface ImportTemplateDialogProps {
  onSuccess: () => void;
}

export function ImportTemplateDialog({ onSuccess }: ImportTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Name and language are now extracted, not input manually
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [extractedLang, setExtractedLang] = useState<string | null>(null);

  const [jsonInput, setJsonInput] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Auto-parse JSON to show metadata
  useEffect(() => {
    if (!jsonInput.trim()) {
      setExtractedName(null);
      setExtractedLang(null);
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setJsonError(null);

      // Try to extract name and language
      const name = parsed.template?.name || parsed.name;
      const lang =
        parsed.template?.language?.code ||
        parsed.language?.code ||
        parsed.language;

      setExtractedName(name || "???");
      setExtractedLang(lang || "???");
    } catch (e) {
      setJsonError("Invalid JSON syntax");
      setExtractedName(null);
      setExtractedLang(null);
    }
  }, [jsonInput]);

  // Extract variables from body text
  useEffect(() => {
    if (!bodyText.trim()) {
      setVariables([]);
      return;
    }
    const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
    const vars = matches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));
    setVariables([...new Set(vars)] as string[]);
  }, [bodyText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput || jsonError) return;

    try {
      setLoading(true);
      await templatesApi.import({
        structure: JSON.parse(jsonInput),
        bodyText: bodyText.trim() || undefined,
      });

      toast.success("Template imported successfully");
      setOpen(false);

      // Reset form
      setJsonInput("");
      setBodyText("");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to import template. Ensure JSON has name and language.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Import Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Template</DialogTitle>
          <DialogDescription>
            Paste the JSON payload and provide the message preview text.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="json" className="flex items-center justify-between">
              <span>JSON Payload</span>
              {jsonError && (
                <span className="text-xs text-red-500">{jsonError}</span>
              )}
            </Label>
            <Textarea
              id="json"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='Paste JSON here... {"template": {"name": "hello_world", "language": {"code": "en"}, ...}}'
              className="font-mono text-xs h-[150px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">
                DETECTED NAME
              </span>
              <p className="text-sm font-medium">{extractedName || "-"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">
                DETECTED LANGUAGE
              </span>
              <div className="text-sm font-medium">
                {extractedLang ? (
                  <Badge variant="outline">{extractedLang}</Badge>
                ) : (
                  "-"
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyText">Message Body / Preview</Label>
            <Textarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="e.g. Dear {{1}}, Our agents are available..."
              className="h-[100px]"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Copy the text exactly as it appears in the template, with{" "}
              {"{{#}}"} variables.
            </p>
          </div>

          {variables.length > 0 && (
            <div className="bg-muted p-4 rounded-md flex items-start gap-2">
              <Code className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Detected Variables
                </span>
                <div className="flex flex-wrap gap-2">
                  {variables.map((v) => (
                    <Badge key={v} variant="secondary">
                      {"{{" + v + "}}"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !!jsonError ||
                !jsonInput ||
                !extractedName ||
                !extractedLang
              }
            >
              {loading ? "Importing..." : "Import Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
