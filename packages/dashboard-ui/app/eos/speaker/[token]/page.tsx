"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Mic,
  User,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Presentation,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { EosSpeaker, EosEvent } from "@/types/eos-events";
import { EngagementManager } from "@/components/eos-events/EngagementManager";

export default function SpeakerPortalPage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<{
    speaker: EosSpeaker;
    event: EosEvent;
  } | null>(null);
  const [formData, setFormData] = useState<Partial<EosSpeaker>>({});

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/speakers/portal/${token}`,
        );
        if (!res.ok) throw new Error("Invalid token");
        const json = await res.json();
        setData(json.data);
        setFormData({
          name: json.data.speaker.name,
          bio: json.data.speaker.bio || "",
          headshotUrl: json.data.speaker.headshotUrl || "",
          talkTitle: json.data.speaker.talkTitle || "",
          presentationUrl: json.data.speaker.presentationUrl || "",
          sessionTime: json.data.speaker.sessionTime || "",
        });
      } catch (e) {
        toast.error("Invalid or expired speaker access");
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/speakers/portal/${token}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update speaker info");
      }

      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground">Loading speaker profile...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-destructive">
          Portal Access Denied
        </h1>
        <p className="text-muted-foreground mt-2">
          This link may have expired or is incorrect.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  const { speaker, event } = data;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Mic className="h-4 w-4" />
            <span>Speaker Portal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground">
            Welcome, <strong>{speaker.name}</strong>. Please finalize your
            session details below.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Speaker Profile
              </CardTitle>
              <CardDescription>
                How you will appear to attendees on the event app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell attendees about yourself..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headshotUrl">Headshot URL</Label>
                <Input
                  id="headshotUrl"
                  placeholder="https://example.com/photo.jpg"
                  value={formData.headshotUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, headshotUrl: e.target.value })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Provide a direct link to your professional photo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Session Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Session Details
              </CardTitle>
              <CardDescription>
                Details regarding your presentation and scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="talkTitle">Talk Title</Label>
                <Input
                  id="talkTitle"
                  placeholder="e.g. The Future of AI in Enterprise"
                  value={formData.talkTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, talkTitle: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTime">Session Date & Time</Label>
                  <div className="relative">
                    <Input
                      id="sessionTime"
                      type="datetime-local"
                      value={
                        formData.sessionTime
                          ? new Date(formData.sessionTime)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sessionTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presentationUrl">
                    Slides / Presentation URL
                  </Label>
                  <div className="relative">
                    <Input
                      id="presentationUrl"
                      placeholder="Google Slides / PDF link"
                      value={formData.presentationUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          presentationUrl: e.target.value,
                        })
                      }
                      className="pl-9"
                    />
                    <Presentation className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Automatically saved as draft</span>
            </div>
            <Button
              type="submit"
              size="lg"
              className="px-8 shadow-lg shadow-primary/20"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <>
                  Save Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Audience Interaction
            </CardTitle>
            <CardDescription>
              Engage with your session attendees via live polls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EngagementManager
              eventId={data.event.id}
              ownerId={speaker.id}
              ownerType="speaker"
            />
          </CardContent>
        </Card>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          Need help? Contact the event organizers at{" "}
          <strong>support@chatnation.io</strong>
        </div>
      </div>
    </div>
  );
}
