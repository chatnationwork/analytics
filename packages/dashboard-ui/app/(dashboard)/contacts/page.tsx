"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
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
import { segmentsApi, type ContactSegment } from "@/lib/segments-api";
import type { AudienceFilter } from "@/lib/broadcast-types";
import { AudienceFilterBuilder } from "@/app/(dashboard)/broadcast/components/AudienceFilterBuilder";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Loader2,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ImportWizard } from "./components/ImportWizard";
import { ExportDialog } from "./components/ExportDialog";

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

function formatNormalizedTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toISOString();
  } catch {
    return iso;
  }
}

function ContactProfileDialog({
  contact,
  open,
  onOpenChange,
  canDeactivate,
  onDeactivate,
}: {
  contact: AnalyticsContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDeactivate?: boolean;
  onDeactivate?: (contactId: string) => Promise<void>;
}) {
  const [deactivating, setDeactivating] = useState(false);
  if (!contact) return null;

  const handleDeactivate = async () => {
    if (!canDeactivate || !onDeactivate) return;
    if (!confirm("Deactivate this contact? They will be removed from the list and export.")) return;
    setDeactivating(true);
    try {
      await onDeactivate(contact.contact_id);
      onOpenChange(false);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Taxpayer Profile</DialogTitle>
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
            <span className="text-muted-foreground">Date created</span>
            <p className="font-medium">{formatDate(contact.first_seen)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Normalized time</span>
            <p className="font-mono text-xs">
              {formatNormalizedTime(contact.first_seen)}
            </p>
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
          {canDeactivate && onDeactivate && (
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? "Deactivating…" : "Deactivate contact"}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"contacts" | "segments">(
    tabParam === "segments" ? "segments" : "contacts"
  );

  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] =
    useState<AnalyticsContact | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFilter, setFormFilter] = useState<AudienceFilter>({
    conditions: [],
    logic: "AND",
  });
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();
  const canCreate = user?.permissions?.global?.includes("contacts.create") === true;
  const canDeactivate = user?.permissions?.global?.includes("contacts.deactivate") === true;
  const canExport = user?.permissions?.global?.includes("contacts.view") === true;

  const { data, isLoading, error } = useQuery({
    queryKey: ["whatsapp-analytics-contacts", page, PAGE_SIZE],
    queryFn: () => whatsappAnalyticsApi.getContacts(page, PAGE_SIZE),
  });

  const loadSegments = async () => {
    try {
      const data = await segmentsApi.list();
      setSegments(data);
    } catch (err) {
      console.error("Failed to load segments:", err);
      toast.error("Failed to load segments");
    } finally {
      setSegmentsLoading(false);
    }
  };

  useEffect(() => {
    if (tabParam === "segments") setActiveTab("segments");
  }, [tabParam]);

  useEffect(() => {
    if (activeTab === "segments") loadSegments();
  }, [activeTab]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const openProfile = (c: AnalyticsContact) => {
    setSelectedContact(c);
    setProfileOpen(true);
  };

  const openCreateSegment = () => {
    setActiveTab("segments");
    setEditingSegmentId(null);
    setFormName("");
    setFormDescription("");
    setFormFilter({ conditions: [], logic: "AND" });
    setSegmentDialogOpen(true);
  };

  const openEditSegment = (s: ContactSegment) => {
    setEditingSegmentId(s.id);
    setFormName(s.name);
    setFormDescription(s.description ?? "");
    setFormFilter(s.filter);
    setSegmentDialogOpen(true);
  };

  const handleSaveSegment = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setSaving(true);
      if (editingSegmentId) {
        await segmentsApi.update(editingSegmentId, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          filter: formFilter,
        });
        toast.success("Segment updated");
      } else {
        await segmentsApi.create({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          filter: formFilter,
        });
        toast.success("Segment created");
      }
      setSegmentDialogOpen(false);
      loadSegments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save segment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (
      !confirm(
        "Delete this segment? Campaigns that used it will keep their audience filter."
      )
    )
      return;
    try {
      await segmentsApi.delete(id);
      toast.success("Segment deleted");
      loadSegments();
    } catch {
      toast.error("Failed to delete segment");
    }
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
          <Button variant="outline" onClick={openCreateSegment}>
            <Layers className="mr-2 h-4 w-4" />
            Create Segment
          </Button>
          {canCreate && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
          {canExport && (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "contacts" | "segments")}>
        <TabsList>
          <TabsTrigger value="contacts">Contact list</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
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
                        <TableHead>Date created</TableHead>
                        <TableHead>Last seen</TableHead>
                        <TableHead className="text-right">Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.data.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-[var(--muted)]"
                          >
                            No contacts found. Import contacts or wait for
                            incoming messages.
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
                            <TableCell className="font-mono text-xs">
                              {formatNormalizedTime(c.first_seen)}
                            </TableCell>
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
                          onClick={() =>
                            setPage((p) => Math.max(1, p - 1))
                          }
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
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Saved Segments</CardTitle>
              <CardDescription>
                Create segments once and reuse them when building campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading segments...
                </div>
              ) : segments.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-2">No segments yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a segment to reuse audience filters across campaigns.
                  </p>
                  <Button onClick={openCreateSegment}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first segment
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Contacts</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {s.description ?? "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.contactCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditSegment(s)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSegment(s.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ContactProfileDialog
        contact={selectedContact}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        canDeactivate={canDeactivate}
        onDeactivate={
          canDeactivate
            ? async (contactId) => {
                await whatsappAnalyticsApi.deactivateContact(contactId);
                toast.success("Contact deactivated");
                queryClient.invalidateQueries({
                  queryKey: ["whatsapp-analytics-contacts"],
                });
              }
            : undefined
        }
      />

      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSegmentId ? "Edit Segment" : "New Segment"}
            </DialogTitle>
            <DialogDescription>
              Define filter rules. The contact count updates automatically when
              saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="segment-name">Name</Label>
              <Input
                id="segment-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. VIP Customers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment-desc">Description (optional)</Label>
              <Textarea
                id="segment-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of who this segment targets"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Audience Rules</Label>
              <AudienceFilterBuilder
                value={formFilter}
                onChange={setFormFilter}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSegment} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSegmentId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </div>
  );
}
