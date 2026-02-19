"use client";

import React, { useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent, EosExhibitor } from "@/types/eos-events";
import { Button } from "@/components/ui/button";
import { VenueGrid } from "./VenueGrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Edit2 } from "lucide-react";

interface VenueMapEditorProps {
  eventId: string;
  event: EosEvent;
  venueLayout: any;
  onUpdate: () => void;
}

export function VenueMapEditor({
  eventId,
  event,
  venueLayout,
  onUpdate,
}: VenueMapEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [exhibitors, setExhibitors] = useState<EosExhibitor[]>([]);
  const [assigningExhibitor, setAssigningExhibitor] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Use local copy of slots for editing
  const [localSlots, setLocalSlots] = useState<any[]>(venueLayout?.slots || []);

  const handleCellClick = (x: number, y: number) => {
    if (!isEditing) return;
    const newSlot = { id: `slot_${Date.now()}`, x, y };
    setLocalSlots([...localSlots, newSlot]);
  };

  const handleSlotClick = (id: string, x: number, y: number) => {
    if (isEditing) {
      // Option to remove slot or assign exhibitor
      setSelectedSlot({ id, x, y });
      eventsApi.listExhibitors(eventId).then(setExhibitors);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = {
        ...event.settings,
        venue_map_config: {
          grid: venueLayout.grid,
          slots: localSlots.map((s) => ({ id: s.id, x: s.x, y: s.y })),
        },
      };
      await eventsApi.update(eventId, { settings: updatedConfig });
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      console.error("Failed to save venue map", e);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSlot || !assigningExhibitor) return;
    try {
      await eventsApi.updateExhibitor(assigningExhibitor, eventId, {
        boothLocation: {
          x: selectedSlot.x,
          y: selectedSlot.y,
          width: 1,
          height: 1,
        },
      });
      setSelectedSlot(null);
      setAssigningExhibitor("");
      onUpdate();
    } catch (e) {
      console.error("Failed to assign exhibitor", e);
    }
  };

  const removeSlot = () => {
    if (!selectedSlot) return;
    setLocalSlots(localSlots.filter((s) => s.id !== selectedSlot.id));
    setSelectedSlot(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Venue Layout Editor</h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" /> Edit Layout
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setLocalSlots(venueLayout?.slots || []);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <VenueGrid
        grid={venueLayout?.grid || { cols: 10, rows: 10 }}
        slots={isEditing ? localSlots : venueLayout?.slots || []}
        exhibitors={venueLayout?.exhibitors || []}
        editable={isEditing}
        onCellClick={handleCellClick}
        onSlotClick={handleSlotClick}
      />

      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Slot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Assign Exhibitor</Label>
              <Select
                value={assigningExhibitor}
                onValueChange={setAssigningExhibitor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an exhibitor" />
                </SelectTrigger>
                <SelectContent>
                  {exhibitors.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssign}
                disabled={!assigningExhibitor}
                className="mt-2"
              >
                Assign Exhibitor
              </Button>
            </div>
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={removeSlot}
              >
                Remove Slot
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedSlot(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
