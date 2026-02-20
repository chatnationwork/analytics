"use client";

import React, { useState } from "react";
import { EosEvent } from "@/types/eos-events";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Loader2, Save } from "lucide-react";
import { eventsApi } from "@/lib/eos-events-api";
import { toast } from "sonner";

interface SlotManagementProps {
  eventId: string;
  event: EosEvent;
  onUpdate: () => void;
}

export function SlotManagement({
  eventId,
  event,
  onUpdate,
}: SlotManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);

  const slots = event.settings?.venue_map_config?.slots || [];

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    type: "standard" as "standard" | "premium" | "booth",
    location: { x: 0, y: 0, width: 1, height: 1 },
  });

  const handleOpenDialog = (slot?: any) => {
    if (slot) {
      setEditingSlot(slot);
      setFormData({
        id: slot.id,
        name: slot.name,
        type: slot.type,
        location: { ...slot.location },
      });
    } else {
      setEditingSlot(null);
      setFormData({
        id: `slot_${Date.now()}`,
        name: "",
        type: "standard",
        location: { x: 0, y: 0, width: 1, height: 1 },
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!formData.name) {
      toast.error("Slot name is required");
      return;
    }

    setSaving(true);
    try {
      let updatedSlots;
      if (editingSlot) {
        updatedSlots = slots.map((s: any) =>
          s.id === editingSlot.id ? { ...formData } : s
        );
      } else {
        // Check for duplicate names
        if (slots.some((s: any) => s.name === formData.name)) {
          toast.error("A slot with this name already exists");
          setSaving(false);
          return;
        }
        updatedSlots = [...slots, { ...formData }];
      }

      const updatedConfig = {
        ...event.settings,
        venue_map_config: {
          ...event.settings?.venue_map_config,
          slots: updatedSlots,
        },
      };

      await eventsApi.update(eventId, { settings: updatedConfig });
      toast.success(editingSlot ? "Slot updated" : "Slot added");
      setIsDialogOpen(false);
      onUpdate();
    } catch (e) {
      console.error("Failed to save slot", e);
      toast.error("Failed to save slot");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;
    try {
      const updatedSlots = slots.filter((s: any) => s.id !== slotId);
      const updatedConfig = {
        ...event.settings,
        venue_map_config: {
          ...event.settings?.venue_map_config,
          slots: updatedSlots,
        },
      };

      await eventsApi.update(eventId, { settings: updatedConfig });
      toast.success("Slot deleted");
      onUpdate();
    } catch (e) {
      console.error("Failed to delete slot", e);
      toast.error("Failed to delete slot");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Venue Slots</h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Slot
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location (X, Y)</TableHead>
              <TableHead>Size (W x H)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No slots defined yet.
                </TableCell>
              </TableRow>
            ) : (
              slots.map((slot: any) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">{slot.name}</TableCell>
                  <TableCell className="capitalize">{slot.type}</TableCell>
                  <TableCell>
                    {slot.location.x}, {slot.location.y}
                  </TableCell>
                  <TableCell>
                    {slot.location.width} x {slot.location.height}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(slot)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Edit Slot" : "Add Slot"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Slot Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Booth A1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="booth">Booth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="x">X Position</Label>
                <Input
                  id="x"
                  type="number"
                  value={formData.location.x}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        x: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="y">Y Position</Label>
                <Input
                  id="y"
                  type="number"
                  value={formData.location.y}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        y: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.location.width}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        width: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.location.height}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        height: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSlot} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!saving && <Save className="mr-2 h-4 w-4" />}
              {editingSlot ? "Update Slot" : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
