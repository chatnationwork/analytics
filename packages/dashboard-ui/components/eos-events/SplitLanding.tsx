"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { eventsApi } from "@/lib/eos-events-api";
import { Loader2, Upload, X, Calendar, MapPin, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { EosEvent } from "@/types/eos-events";

interface SplitLandingProps {
  onCreated?: (event: EosEvent) => void;
}

export const SplitLanding: React.FC<SplitLandingProps> = ({ onCreated }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startsAt: "",
    endsAt: "",
    venueName: "",
    coverImageUrl: "",
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.uploadMedia(file);
      setFormData({ ...formData, coverImageUrl: result.url });
      toast.success("Image uploaded successfully");
    } catch (e) {
      console.error("Upload failed", e);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

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
      toast.success("Event created successfully!");
      if (onCreated) {
        onCreated(event);
      } else {
        router.push(`/eos-events/${event.id}`);
      }
    } catch (error) {
      console.error("Failed to create event", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Calendar className="w-5 h-5 text-primary" />,
      title: "Seamless Scheduling",
      description: "Manage speakers, sessions, and tracks with ease.",
    },
    {
      icon: <MapPin className="w-5 h-5 text-primary" />,
      title: "Interactive Venue Maps",
      description: "Design and manage your event floor plan visually.",
    },
    {
      icon: <Users className="w-5 h-5 text-primary" />,
      title: "Exhibitor Management",
      description: "Streamline booth bookings and exhibitor communications.",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Real-time Engagement",
      description: "Boost attendee interaction with live polls and Q&A.",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)] rounded-xl overflow-hidden border bg-card">
      {/* Left Side: Marketing/Value Prop */}
      <div className="lg:w-1/2 p-8 lg:p-12 bg-muted/30 flex flex-col justify-center">
        <div className="max-w-md mx-auto lg:mx-0">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground mb-6">
            New Feature
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            Transform Your Events with EOS
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            The Event Operating System (EOS) provides everything you need to plan, execute, and scale world-class events.
          </p>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
            <p className="text-sm">
              Join hundreds of organizers who have already simplified their event management with EOS.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Creation Form */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Create Your Event</h2>
            <p className="text-muted-foreground mt-1">
              Fill in the details below to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                placeholder="e.g. Annual Tech Summit 2024"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start Date</Label>
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
                <Label htmlFor="endsAt">End Date</Label>
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
              <Label htmlFor="venueName">Venue Location</Label>
              <Input
                id="venueName"
                placeholder="e.g. Convention Center, Nairobi"
                value={formData.venueName}
                onChange={(e) =>
                  setFormData({ ...formData, venueName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label>Cover Image (Optional)</Label>
              {formData.coverImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border aspect-video group">
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setFormData({ ...formData, coverImageUrl: "" })
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center space-y-2 relative hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or WEBP (Max. 5MB)
                  </p>
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-6" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create My Event
            </Button>
            
            <p className="text-[10px] text-center text-muted-foreground mt-4">
              By creating an event, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
