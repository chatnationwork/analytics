"use client";

import React, { useEffect, useState } from "react";
import { eventsApi } from "@/lib/eos-events-api";
import { EosTicketType } from "@/types/eos-events";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TicketTypeManagerProps {
  eventId: string;
}

export function TicketTypeManager({ eventId }: TicketTypeManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<EosTicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<{
    name: string;
    price: number;
    currency: string;
    quantityTotal: number;
    metadata?: Record<string, any>;
  }>({
    name: "",
    price: 0,
    currency: "KES",
    quantityTotal: 100,
  });

  const loadTicketTypes = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.listTicketTypes(eventId);
      setTicketTypes(data);
    } catch (e) {
      console.error("Failed to load ticket types", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketTypes();
  }, [eventId]);

  const handleCreate = async () => {
    try {
      await eventsApi.createTicketType(eventId, newType);
      toast.success("Ticket type created successfully");
      setIsDialogOpen(false);
      loadTicketTypes();
      setNewType({ name: "", price: 0, currency: "KES", quantityTotal: 100 });
    } catch (e) {
      console.error("Failed to create ticket type", e);
      toast.error("Failed to create ticket type");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this ticket type?"))
      return;
    try {
      await eventsApi.deleteTicketType(id, eventId);
      toast.success("Ticket type deactivated");
      loadTicketTypes();
    } catch (e) {
      console.error("Failed to delete ticket type", e);
      toast.error("Failed to deactivate ticket type");
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
        <h3 className="text-lg font-medium">Ticket Types</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ticket Type / Tier</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Name (e.g. Platinum, Gold, General)
                </Label>
                <Input
                  id="name"
                  value={newType.name}
                  onChange={(e) =>
                    setNewType({ ...newType, name: e.target.value })
                  }
                  placeholder="Platinum VIP"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newType.price}
                    onChange={(e) =>
                      setNewType({
                        ...newType,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={newType.currency}
                    onChange={(e) =>
                      setNewType({ ...newType, currency: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Total Quantity (Inventory)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newType.quantityTotal}
                  onChange={(e) =>
                    setNewType({
                      ...newType,
                      quantityTotal: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              {/* Tier Perks Configuration */}
              <div className="grid gap-2 mt-2">
                <Label className="font-semibold text-primary">
                  Predefined Tier Perks
                </Label>
                <div className="rounded-md border p-3 bg-muted/30 grid grid-cols-2 gap-3 mt-1">
                  {[
                    { id: "vipLounge", label: "VIP Lounge Access" },
                    { id: "privateRoom", label: "Private Room" },
                    { id: "dedicatedCatering", label: "Dedicated Catering" },
                    { id: "prioritySeating", label: "Priority Seating" },
                    { id: "vipEscort", label: "VIP Escort" },
                  ].map((perk) => (
                    <label
                      key={perk.id}
                      className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="rounded border-input text-primary focus:ring-ring"
                        onChange={(e) => {
                          const currentMeta = (newType as any).metadata || {};
                          setNewType({
                            ...newType,
                            metadata: {
                              ...currentMeta,
                              perks: {
                                ...(currentMeta.perks || {}),
                                [perk.id]: e.target.checked,
                              },
                            },
                          });
                        }}
                      />
                      <span>{perk.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create Ticket Type</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Perks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketTypes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No ticket types defined yet.
                </TableCell>
              </TableRow>
            ) : (
              ticketTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    {type.price} {type.currency}
                  </TableCell>
                  <TableCell>
                    {type.quantitySold} / {type.quantityTotal || "∞"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {type.metadata?.perks &&
                        Object.entries(type.metadata.perks)
                          .filter(([_, isActive]) => isActive)
                          .map(([key]) => {
                            const labels: Record<string, string> = {
                              vipLounge: "VIP Lounge",
                              privateRoom: "Private Room",
                              dedicatedCatering: "Catering",
                              prioritySeating: "Priority Seat",
                              vipEscort: "Escort",
                            };
                            return (
                              <Badge
                                key={key}
                                variant="secondary"
                                className="text-xs"
                              >
                                {labels[key] || key}
                              </Badge>
                            );
                          })}
                      {(!type.metadata?.perks ||
                        Object.values(type.metadata.perks).filter(Boolean)
                          .length === 0) && (
                        <span className="text-muted-foreground text-xs italic">
                          Standard
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {type.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(type.id)}
                      disabled={!type.isActive}
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
