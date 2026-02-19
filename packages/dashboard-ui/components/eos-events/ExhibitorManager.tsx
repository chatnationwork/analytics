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
import { Loader2, Plus, Check, X, Trash2 } from "lucide-react";
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

  const handleCreate = async () => {
    try {
      await eventsApi.createExhibitor(eventId, newExhibitor);
      toast.success("Exhibitor added successfully");
      setIsDialogOpen(false);
      loadExhibitors();
      setNewExhibitor({ name: "", description: "", boothNumber: "" });
    } catch (e) {
      console.error("Failed to create exhibitor", e);
      toast.error("Failed to add exhibitor");
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
              <Plus className="mr-2 h-4 w-4" /> Add Exhibitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exhibitor</DialogTitle>
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
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Add Exhibitor</Button>
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
