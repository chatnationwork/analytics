"use client";

import { useState, useEffect } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosLocation } from "@/types/eos-events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MapPin } from "lucide-react";

export function LocationManager({ eventId }: { eventId: string }) {
  const [locations, setLocations] = useState<EosLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", description: "" });

  useEffect(() => {
    loadLocations();
  }, [eventId]);

  const loadLocations = async () => {
    try {
      const data = await eventsApi.listLocations(eventId);
      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await eventsApi.createLocation(eventId, newLocation);
      setNewLocation({ name: "", description: "" });
      setIsOpen(false);
      loadLocations();
    } catch (error) {
      console.error("Failed to create location:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Check-in Locations</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Check-in Location</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  placeholder="Main Entrance, VIP Lounge, etc."
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the entry point"
                  value={newLocation.description}
                  onChange={(e) =>
                    setNewLocation({
                      ...newLocation,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newLocation.name}>
              Create Location
            </Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No locations defined for this event yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      {location.name}
                    </div>
                  </TableCell>
                  <TableCell>{location.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
