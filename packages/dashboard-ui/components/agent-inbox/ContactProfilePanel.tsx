"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  agentApi,
  type ContactProfile,
  type ContactNote,
  type ContactHistoryEntry,
  type UpdateContactProfileDto,
} from "@/lib/api/agent";
import { toast } from "sonner";
import {
  User,
  Save,
  Loader2,
  StickyNote,
  History,
  Phone,
  Mail,
  KeyRound,
  Calendar,
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
  if (!contactId) {
    throw new Error("ContactProfilePanel requires contactId");
  }

  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
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
  const [historyPage, setHistoryPage] = useState(1);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await agentApi.getContactProfile(
        contactId,
        contactName ?? undefined,
      );
      setProfile(data);
      setEditName(data.name ?? "");
      setEditPin(data.pin ?? "");
      setEditYearOfBirth(
        data.yearOfBirth != null ? String(data.yearOfBirth) : "",
      );
      setEditEmail(data.email ?? "");
      setEditMetadata(data.metadata ?? {});
    } catch (e) {
      console.error("Failed to fetch contact profile:", e);
      toast.error("Failed to load contact profile");
      setProfile(null);
    }
  }, [contactId, contactName]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await agentApi.getContactNotes(contactId, NOTES_LIMIT);
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch notes:", e);
      setNotes([]);
    }
  }, [contactId]);

  const fetchHistory = useCallback(
    async (page: number = 1) => {
      try {
        const { data, total } = await agentApi.getContactHistory(
          contactId,
          page,
          HISTORY_PAGE_SIZE,
        );
        setHistory(Array.isArray(data) ? data : []);
        setHistoryTotal(typeof total === "number" ? total : 0);
        setHistoryPage(page);
      } catch (e) {
        console.error("Failed to fetch history:", e);
        setHistory([]);
        setHistoryTotal(0);
      }
    },
    [contactId],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchNotes(), fetchHistory(1)]).finally(() =>
      setLoading(false),
    );
  }, [fetchProfile, fetchNotes, fetchHistory]);

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
      fetchHistory(1);
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
      const note = await agentApi.addContactNote(contactId, content);
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
                      {note.authorName ?? "Unknown"} ·{" "}
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
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Profile changes
              </span>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border bg-muted/20 p-2 text-xs"
                  >
                    <p className="font-medium text-foreground">
                      {entry.actorName ?? "System"}
                    </p>
                    <p className="text-muted-foreground capitalize">
                      {entry.action.replace(/_/g, " ")}
                    </p>
                    {entry.details &&
                      typeof entry.details === "object" &&
                      Object.keys(entry.details).length > 0 && (
                        <pre className="mt-1 text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap wrap-break-word">
                          {JSON.stringify(entry.details, null, 0)}
                        </pre>
                      )}
                    <p className="text-muted-foreground mt-1">
                      {formatDate(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {historyTotal > HISTORY_PAGE_SIZE && (
              <div className="flex gap-2 mt-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => fetchHistory(historyPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage * HISTORY_PAGE_SIZE >= historyTotal}
                  onClick={() => fetchHistory(historyPage + 1)}
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
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
    return iso;
  }
}
