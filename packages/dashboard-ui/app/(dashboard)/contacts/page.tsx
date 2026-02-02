"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/dialog";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";
import { Users, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] =
    useState<AnalyticsContact | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["whatsapp-analytics-contacts", page, PAGE_SIZE],
    queryFn: () => whatsappAnalyticsApi.getContacts(page, PAGE_SIZE),
  });

  const { data: newContactsTrend } = useQuery({
    queryKey: ["new-contacts-trend", "day", 30],
    queryFn: () => whatsappAnalyticsApi.getNewContactsTrend("day", 30),
  });

  const newContacts30d = (() => {
    if (newContactsTrend == null) return null;
    const withSummary = newContactsTrend as {
      summary?: { totalNewContacts?: number };
      data?: { newContacts?: number }[];
    };
    if (typeof withSummary.summary?.totalNewContacts === "number")
      return withSummary.summary.totalNewContacts;
    const arr = Array.isArray(newContactsTrend)
      ? newContactsTrend
      : withSummary.data;
    return Array.isArray(arr)
      ? (arr as { newContacts?: number }[]).reduce(
          (s, x) => s + (x.newContacts ?? 0),
          0,
        )
      : null;
  })();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const openProfile = (c: AnalyticsContact) => {
    setSelectedContact(c);
    setProfileOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Contacts
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Contacts derived from WhatsApp analytics (message events). Anyone who
          has sent a message appears here.
        </p>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">
              Total contacts
            </CardTitle>
            <Users className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {data != null ? data.total.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Unique contacts with at least one message (analytics)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">
              New contacts (last 30 days)
            </CardTitle>
            <UserPlus className="h-4 w-4 text-[var(--muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {newContacts30d != null ? newContacts30d.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              First message in period (analytics)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
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
                        No contacts found. Contacts appear after they send a
                        message (WhatsApp analytics).
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
    </div>
  );
}
