"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  agentApi,
  type ContactProfile,
  type ContactNote,
  type ContactResolution,
  type UpdateContactProfileDto,
} from "@/lib/api/agent";
import { toast } from "sonner";
import {
  User,
  Save,
  Loader2,
  StickyNote,
  Phone,
  Mail,
  KeyRound,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";

const HISTORY_PAGE_SIZE = 20;
const NOTES_LIMIT = 50;

export interface ContactProfilePanelProps {
  contactId: string;
  contactName?: string | null;
}

export function ContactProfilePanel({
  contactId,
  contactName,
}: ContactProfilePanelProps) {
  if (!contactId || String(contactId).trim() === "") {
    return null;
  }

  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [resolutions, setResolutions] = useState<ContactResolution[]>([]);
  const [resolutionsTotal, setResolutionsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Editable form state (mirrors profile until save)
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editYearOfBirth, setEditYearOfBirth] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMetadata, setEditMetadata] = useState<Record<string, string>>({});
  const [newNoteContent, setNewNoteContent] = useState("");
  const [resolutionsPage, setResolutionsPage] = useState(1);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await agentApi.getContactProfile(
        contactId,
        contactName ?? undefined,
      );
      const contact: ContactProfile | null =
        data && typeof data === "object" && "contactId" in data
          ? (data as ContactProfile)
          : ((data as { data?: ContactProfile })?.data ?? null);
      setProfile(contact);
      setEditName(contact?.name ?? "");
      setEditPin(contact?.pin ?? "");
      setEditYearOfBirth(
        contact?.yearOfBirth != null ? String(contact.yearOfBirth) : "",
      );
      setEditEmail(contact?.email ?? "");
      setEditMetadata(contact?.metadata ?? {});
    } catch (e) {
      console.error("Failed to fetch contact profile:", e);
      toast.error("Failed to load contact profile");
      setProfile(null);
    }
  }, [contactId, contactName]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await agentApi.getContactNotes(contactId, NOTES_LIMIT);
      setNotes(
        Array.isArray(data)
          ? data
          : data && typeof data === "object" && "data" in data
            ? (data as { data: ContactNote[] }).data
            : [],
      );
    } catch (e) {
      console.error("Failed to fetch notes:", e);
      setNotes([]);
    }
  }, [contactId]);

  const fetchResolutions = useCallback(
    async (page: number = 1) => {
      try {
        const { data, total } = await agentApi.getContactResolutions(
          contactId,
          page,
          HISTORY_PAGE_SIZE,
        );
        setResolutions(Array.isArray(data) ? data : []);
        setResolutionsTotal(typeof total === "number" ? total : 0);
        setResolutionsPage(page);
      } catch (e) {
        console.error("Failed to fetch resolutions:", e);
        setResolutions([]);
        setResolutionsTotal(0);
      }
    },
    [contactId],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchNotes(), fetchResolutions(1)]).finally(
      () => setLoading(false),
    );
  }, [fetchProfile, fetchNotes, fetchResolutions]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const yob =
        editYearOfBirth.trim() === ""
          ? null
          : parseInt(editYearOfBirth.trim(), 10);
      if (
        editYearOfBirth.trim() !== "" &&
        (yob === null ||
          Number.isNaN(yob) ||
          yob < 1900 ||
          yob > new Date().getFullYear())
      ) {
        toast.error("Year of birth must be between 1900 and current year");
        return;
      }
      const dto: UpdateContactProfileDto = {
        name: editName.trim() || null,
        pin: editPin.trim() || null,
        yearOfBirth: yob ?? null,
        email: editEmail.trim() || null,
        metadata: Object.keys(editMetadata).length > 0 ? editMetadata : null,
      };
      const updated = await agentApi.updateContactProfile(contactId, dto);
      setProfile(updated);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newNoteContent.trim();
    if (!content) return;
    setAddingNote(true);
    try {
      const raw = await agentApi.addContactNote(contactId, content);
      const note: ContactNote =
        raw && typeof raw === "object" && "id" in raw
          ? (raw as ContactNote)
          : ((raw as { data?: ContactNote })?.data ?? raw);
      setNotes((prev) => [note, ...prev]);
      setNewNoteContent("");
      toast.success("Note added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const profileYob =
    profile?.yearOfBirth != null ? String(profile.yearOfBirth) : "";
  const hasProfileChanges =
    profile &&
    (editName !== (profile.name ?? "") ||
      editPin !== (profile.pin ?? "") ||
      editYearOfBirth !== profileYob ||
      editEmail !== (profile.email ?? "") ||
      JSON.stringify(editMetadata) !== JSON.stringify(profile.metadata ?? {}));

  if (loading && !profile) {
    return (
      <Card className="w-full max-w-sm flex flex-col h-full">
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="border-b py-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Contact profile
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {contactId}
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full rounded-none border-b mx-0 h-9 bg-muted/50">
            <TabsTrigger value="profile" className="flex-1 text-xs">
              Profile
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 text-xs">
              Notes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="profile"
            className="flex-1 overflow-y-auto mt-0 p-3 data-[state=inactive]:hidden"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contact name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-phone"
                  className="flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Number
                </Label>
                <p className="text-sm text-muted-foreground font-mono truncate">
                  {contactId}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-pin"
                  className="flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  PIN
                </Label>
                <Input
                  id="contact-pin"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  placeholder="PIN"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-yob"
                  className="flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Year of birth
                </Label>
                <Input
                  id="contact-yob"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={editYearOfBirth}
                  onChange={(e) => setEditYearOfBirth(e.target.value)}
                  placeholder="e.g. 1990"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-email"
                  className="flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-9"
                />
              </div>
              {profile && (
                <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                  <p>First seen: {formatDate(profile.firstSeen)}</p>
                  <p>Last seen: {formatDate(profile.lastSeen)}</p>
                  <p>Messages: {profile.messageCount}</p>
                </div>
              )}
              {hasProfileChanges && (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </Button>
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="notes"
            className="flex-1 overflow-y-auto mt-0 p-3 data-[state=inactive]:hidden flex flex-col min-h-0"
          >
            <form onSubmit={handleAddNote} className="space-y-2 mb-3">
              <Label htmlFor="new-note">Add note</Label>
              <textarea
                id="new-note"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Add a note about this contact..."
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newNoteContent.trim() || addingNote}
                className="gap-2"
              >
                {addingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4" />
                )}
                Add note
              </Button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border bg-muted/30 p-2.5 text-sm"
                  >
                    <p className="text-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {note.authorName ?? "Agent"} ·{" "}
                      {formatDate(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="history"
            className="flex-1 overflow-y-auto mt-0 p-3 data-[state=inactive]:hidden flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Wrap-up reports
              </span>
              <Link
                href={`/audit-logs?resourceType=contact&resourceId=${encodeURIComponent(contactId)}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View activity log
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            {resolutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wrap-up reports yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {resolutions.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border bg-muted/20 p-2 text-xs"
                  >
                    <p className="font-medium text-foreground">
                      {r.resolvedByAgentName ?? "Agent"}
                    </p>
                    <p className="text-muted-foreground capitalize">
                      {r.category}
                      {r.outcome && r.outcome !== "resolved"
                        ? ` · ${r.outcome}`
                        : ""}
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-foreground/90 whitespace-pre-wrap">
                        {r.notes}
                      </p>
                    )}
                    {r.formData &&
                      typeof r.formData === "object" &&
                      Object.keys(r.formData).length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {Object.entries(r.formData).map(([k, v]) => (
                            <p
                              key={k}
                              className="text-[10px] text-muted-foreground"
                            >
                              <span className="font-medium">{k}:</span>{" "}
                              {String(v)}
                            </p>
                          ))}
                        </div>
                      )}
                    <p className="text-muted-foreground mt-1">
                      {formatDate(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {resolutionsTotal > HISTORY_PAGE_SIZE && (
              <div className="flex gap-2 mt-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resolutionsPage <= 1}
                  onClick={() => fetchResolutions(resolutionsPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    resolutionsPage * HISTORY_PAGE_SIZE >= resolutionsTotal
                  }
                  onClick={() => fetchResolutions(resolutionsPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string | undefined): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
