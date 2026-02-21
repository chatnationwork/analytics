"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosExhibitor } from "@/types/eos-events";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Plus,
  Check,
  X,
  Trash2,
  Globe,
  QrCode,
  UserPlus,
  ExternalLink,
  Copy,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

interface ExhibitorManagerProps {
  eventId: string;
}

export function ExhibitorManager({ eventId }: ExhibitorManagerProps) {
  const [exhibitors, setExhibitors] = useState<EosExhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExhibitor, setNewExhibitor] = useState({
    name: "",
    description: "",
    boothNumber: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  const loadExhibitors = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.listExhibitors(eventId);
      setExhibitors(data);
    } catch (e) {
      console.error("Failed to load exhibitors", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExhibitors();
  }, [eventId]);

  const handleInvite = async () => {
    try {
      await eventsApi.inviteExhibitor(eventId, newExhibitor);
      toast.success("Invitation sent successfully");
      setIsDialogOpen(false);
      loadExhibitors();
      setNewExhibitor({
        name: "",
        description: "",
        boothNumber: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      });
    } catch (e) {
      console.error("Failed to invite exhibitor", e);
      toast.error("Failed to send invitation");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await eventsApi.approveExhibitor(id, eventId);
      toast.success("Exhibitor approved");
      loadExhibitors();
    } catch (e) {
      console.error("Failed to approve exhibitor", e);
      toast.error("Failed to approve exhibitor");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await eventsApi.rejectExhibitor(id, eventId);
      toast.success("Exhibitor rejected");
      loadExhibitors();
    } catch (e) {
      console.error("Failed to reject exhibitor", e);
      toast.error("Failed to reject exhibitor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this exhibitor?")) return;
    try {
      await eventsApi.deleteExhibitor(id, eventId);
      toast.success("Exhibitor removed");
      loadExhibitors();
    } catch (e) {
      console.error("Failed to remove exhibitor", e);
      toast.error("Failed to remove exhibitor");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} link copied to clipboard`);
  };

  const getPortalUrl = (path: string, token?: string) => {
    if (!token) return "#";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/eos/${path}/${token}`;
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
        <h3 className="text-lg font-medium">Exhibitors</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Invite Exhibitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Exhibitor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newExhibitor.name}
                  onChange={(e) =>
                    setNewExhibitor({ ...newExhibitor, name: e.target.value })
                  }
                  placeholder="ACME Corp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newExhibitor.description}
                  onChange={(e) =>
                    setNewExhibitor({
                      ...newExhibitor,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="booth">Booth Number</Label>
                <Input
                  id="booth"
                  value={newExhibitor.boothNumber}
                  onChange={(e) =>
                    setNewExhibitor({
                      ...newExhibitor,
                      boothNumber: e.target.value,
                    })
                  }
                  placeholder="A12"
                />
              </div>

              <div className="grid gap-2 border-t pt-4">
                <p className="text-sm font-medium">Contact Person</p>
                <div className="grid gap-2">
                  <Label htmlFor="contactName">Full Name</Label>
                  <Input
                    id="contactName"
                    value={newExhibitor.contactName}
                    onChange={(e) =>
                      setNewExhibitor({
                        ...newExhibitor,
                        contactName: e.target.value,
                      })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={newExhibitor.contactPhone}
                    onChange={(e) =>
                      setNewExhibitor({
                        ...newExhibitor,
                        contactPhone: e.target.value,
                      })
                    }
                    placeholder="254712345678"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactEmail">Email (Optional)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={newExhibitor.contactEmail}
                    onChange={(e) =>
                      setNewExhibitor({
                        ...newExhibitor,
                        contactEmail: e.target.value,
                      })
                    }
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Booth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Portals</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exhibitors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No exhibitors registered yet.
                </TableCell>
              </TableRow>
            ) : (
              exhibitors.map((exhibitor) => (
                <TableRow key={exhibitor.id}>
                  <TableCell className="font-medium">
                    {exhibitor.name}
                  </TableCell>
                  <TableCell>{exhibitor.boothNumber || "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        exhibitor.status === "approved"
                          ? "default"
                          : exhibitor.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {exhibitor.status.charAt(0).toUpperCase() +
                        exhibitor.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Public Portals</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(
                              getPortalUrl(
                                "onboarding",
                                exhibitor.invitationToken,
                              ),
                              "Onboarding",
                            )
                          }
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>Copy Onboarding Link</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(
                              getPortalUrl("booth", exhibitor.invitationToken),
                              "Booth",
                            )
                          }
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          <span>Copy Booth Link</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(
                              getPortalUrl(
                                "exhibitor",
                                exhibitor.invitationToken,
                              ),
                              "Profile",
                            )
                          }
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          <span>Copy Profile Link</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a
                            href={getPortalUrl(
                              "booth",
                              exhibitor.invitationToken,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span>Open Booth Portal</span>
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {exhibitor.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(exhibitor.id)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(exhibitor.id)}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(exhibitor.id)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
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
