"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";
import { ChevronLeft, ChevronRight, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 20;

type AnalyticsContact = {
  contact_id: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  message_count: number;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function ContactProfileDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: AnalyticsContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!contact) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium">{contact.name || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact ID</span>
            <p className="font-mono text-xs break-all">{contact.contact_id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">First seen</span>
            <p className="font-medium">{formatDate(contact.first_seen)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last seen</span>
            <p className="font-medium">{formatDate(contact.last_seen)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Messages received</span>
            <p className="font-medium">
              {contact.message_count.toLocaleString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportContactsDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const importMutation = useMutation({
    mutationFn: (file: File) => whatsappAnalyticsApi.importContacts(file),
    onSuccess: () => {
      toast.success("Contacts imported successfully");
      onOpenChange(false);
      onSuccess();
      setFile(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to import contacts");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    importMutation.mutate(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with "Name" and "Phone" columns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csvFile">CSV File</Label>
            <Input 
              id="csvFile" 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || importMutation.isPending}>
              {importMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] =
    useState<AnalyticsContact | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["whatsapp-analytics-contacts", page, PAGE_SIZE],
    queryFn: () => whatsappAnalyticsApi.getContacts(page, PAGE_SIZE),
  });

  const exportMutation = useMutation({
    mutationFn: () => whatsappAnalyticsApi.exportContacts(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Contacts exported successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to export contacts");
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const openProfile = (c: AnalyticsContact) => {
    setSelectedContact(c);
    setProfileOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Contacts
          </h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Contacts derived from WhatsApp analytics (message events).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact list</CardTitle>
          <p className="text-sm text-[var(--muted)]">
            Click a row to view profile and message stats.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive py-4">
              {error instanceof Error
                ? error.message
                : "Failed to load contacts."}
            </p>
          )}
          {isLoading && (
            <p className="text-sm text-[var(--muted)] py-4">
              Loading contacts…
            </p>
          )}
          {!isLoading && !error && data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact ID</TableHead>
                    <TableHead>First seen</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-[var(--muted)]"
                      >
                        No contacts found. Import contacts or wait for incoming messages.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((c) => (
                      <TableRow
                        key={c.contact_id}
                        className="cursor-pointer"
                        onClick={() => openProfile(c)}
                      >
                        <TableCell className="font-medium">
                          {c.name || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {c.contact_id}
                        </TableCell>
                        <TableCell>{formatDate(c.first_seen)}</TableCell>
                        <TableCell>{formatDate(c.last_seen)}</TableCell>
                        <TableCell className="text-right">
                          {c.message_count.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {data.data.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-[var(--muted)]">
                    Page {page} of {totalPages} · {data.total.toLocaleString()}{" "}
                    total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canPrev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canNext}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ContactProfileDialog
        contact={selectedContact}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
      
      <ImportContactsDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["whatsapp-analytics-contacts"] })} 
      />
    </div>
  );
}
