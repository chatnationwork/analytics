"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eye } from "lucide-react";

interface MessagePreviewProps {
  message: string;
}

export function MessagePreview({ message }: MessagePreviewProps) {
  // Mock contact data for preview
  const mockContact = {
    name: "John Doe",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890",
    pin: "A1234567Z",
    yearOfBirth: "1990",
    today: new Date().toLocaleDateString("en-GB"),
    tomorrow: new Date(Date.now() + 86400000).toLocaleDateString("en-GB"),
    greeting: new Date().getHours() < 12 ? "Good morning" : "Good afternoon",
    company: "Acme Inc", // Example metadata
  };

  /**
   * Simple client-side renderer for preview purposes.
   * Matches backend logic but runs locally for instant feedback.
   */
  const renderPreview = (template: string) => {
    if (!template) return "";

    return template.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      const parts = content.split("|").map((s: string) => s.trim());
      const field = parts[0];
      const fallback = parts[1] || "";

      // Handle metadata
      if (field.startsWith("metadata.")) {
        const metaKey = field.substring(9);
        // We only mock 'company' for now
        if (metaKey === "company") return mockContact.company;
        return fallback || `[${field}]`;
      }

      const value = mockContact[field as keyof typeof mockContact];
      return value || fallback || `[${field}]`;
    });
  };

  const rendered = renderPreview(message);
  const hasUnresolved = rendered.includes("[");

  if (!message) return null;

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
          <Eye className="w-4 h-4 mr-2" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border text-sm whitespace-pre-wrap shadow-sm">
          {rendered}
        </div>

        {hasUnresolved && (
          <Alert variant="warning" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Potential Issues</AlertTitle>
            <AlertDescription className="text-xs">
              Some placeholders couldn't be resolved with sample data.
              Ensure you have fallback values for optional fields.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          Previews are generated using sample data (John Doe).
        </div>
      </CardContent>
    </Card>
  );
}
