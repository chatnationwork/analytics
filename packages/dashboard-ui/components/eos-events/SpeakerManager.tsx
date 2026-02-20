"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosSpeaker } from "@/types/eos-events";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

interface SpeakerManagerProps {
  eventId: string;
}

export function SpeakerManager({ eventId }: SpeakerManagerProps) {
  const [speakers, setSpeakers] = useState<EosSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({
    name: "",
    bio: "",
    talkTitle: "",
    contactPhone: "",
    contactEmail: "",
  });

  const loadSpeakers = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.listSpeakers(eventId);
      setSpeakers(data);
    } catch (e) {
      console.error("Failed to load speakers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpeakers();
  }, [eventId]);

  const handleCreate = async () => {
    try {
      if (!newSpeaker.name) {
        toast.error("Speaker name is required");
        return;
      }
      await eventsApi.createSpeaker(eventId, newSpeaker);
      toast.success("Speaker added successfully");
      setIsDialogOpen(false);
      loadSpeakers();
      setNewSpeaker({
        name: "",
        bio: "",
        talkTitle: "",
        contactPhone: "",
        contactEmail: "",
      });
    } catch (e) {
      console.error("Failed to add speaker", e);
      toast.error("Failed to add speaker");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this speaker?")) return;
    try {
      await eventsApi.deleteSpeaker(id, eventId);
      toast.success("Speaker removed");
      loadSpeakers();
    } catch (e) {
      console.error("Failed to remove speaker", e);
      toast.error("Failed to remove speaker");
    }
  };

  const copyPortalLink = (token: string) => {
    const url = `${window.location.origin}/eos/speaker/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Speakers</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Speaker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Speaker</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newSpeaker.name}
                  onChange={(e) =>
                    setNewSpeaker({ ...newSpeaker, name: e.target.value })
                  }
                  placeholder="e.g. Dr. Jane Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="talkTitle">Talk Title</Label>
                <Input
                  id="talkTitle"
                  value={newSpeaker.talkTitle}
                  onChange={(e) =>
                    setNewSpeaker({ ...newSpeaker, talkTitle: e.target.value })
                  }
                  placeholder="e.g. Scaling AI Infrastructure"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input
                  id="contactPhone"
                  value={newSpeaker.contactPhone}
                  onChange={(e) =>
                    setNewSpeaker({
                      ...newSpeaker,
                      contactPhone: e.target.value,
                    })
                  }
                  placeholder="254..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={newSpeaker.contactEmail}
                  onChange={(e) =>
                    setNewSpeaker({
                      ...newSpeaker,
                      contactEmail: e.target.value,
                    })
                  }
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Add Speaker</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Speaker</TableHead>
              <TableHead>Talk Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Portal Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No speakers added to this event.
                </TableCell>
              </TableRow>
            ) : (
              speakers.map((speaker) => (
                <TableRow key={speaker.id}>
                  <TableCell>
                    <div className="font-medium">{speaker.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {speaker.contactEmail || speaker.contactPhone}
                    </div>
                  </TableCell>
                  <TableCell>{speaker.talkTitle || "TBD"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        speaker.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {speaker.status.charAt(0).toUpperCase() +
                        speaker.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(speaker as any).invitationToken && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            copyPortalLink((speaker as any).invitationToken)
                          }
                          title="Copy Portal Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <a
                          href={`/eos/speaker/${(speaker as any).invitationToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(speaker.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
