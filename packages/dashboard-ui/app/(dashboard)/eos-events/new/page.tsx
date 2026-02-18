"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventsApi } from "@/lib/eos-events-api";
import { Loader2 } from "lucide-react";

export default function NewEosEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startsAt: "",
    endsAt: "",
    venueName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const event = await eventsApi.create({
        ...formData,
        isVirtual: false,
        settings: {
          hype_card_on_reg: true,
          venue_map_config: { grid: { cols: 10, rows: 10 }, slots: [] },
        },
      });
      router.push(`/eos-events/${event.id}`);
    } catch (error) {
      console.error("Failed to create event", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New EOS Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start Date & Time</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  required
                  value={formData.startsAt}
                  onChange={(e) =>
                    setFormData({ ...formData, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">End Date & Time</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  required
                  value={formData.endsAt}
                  onChange={(e) =>
                    setFormData({ ...formData, endsAt: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueName">Venue Name</Label>
              <Input
                id="venueName"
                value={formData.venueName}
                onChange={(e) =>
                  setFormData({ ...formData, venueName: e.target.value })
                }
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
