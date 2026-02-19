"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportTemplateDialog } from "./_components/ImportTemplateDialog";
import { templatesApi, Template } from "@/lib/templates-api";
import { Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.list();
      setTemplates(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await templatesApi.delete(id);
      toast.success("Template deleted");
      loadTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Templates</h2>
          <p className="text-muted-foreground">
            Manage your message templates imported from CRM.
          </p>
        </div>
        <ImportTemplateDialog onSuccess={loadTemplates} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imported Templates</CardTitle>
          <CardDescription>
            These templates are available for use in your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No templates found. Import one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {template.name}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                            {template.language}
                        </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {template.bodyText || "No preview text available"}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {template.variables.length > 0 ? template.variables.map(v => (
                                <Badge key={v} variant="secondary" className="text-[10px] h-5 px-1.5">
                                    {v}
                                </Badge>
                            )) : (
                                <span className="text-xs text-muted-foreground">-</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={
                            template.status === 'approved' ? 'default' : 
                            template.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                            {template.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(template.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
