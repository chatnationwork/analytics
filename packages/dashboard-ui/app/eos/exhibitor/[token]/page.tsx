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
  Store,
  Image as ImageIcon,
  Video,
  FileText,
  Globe,
  Plus,
  X,
  ArrowRight,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { EosExhibitor, EosEvent } from "@/types/eos-events";
import { EngagementManager } from "@/components/eos-events/EngagementManager";

export default function ExhibitorPortalPage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<{
    exhibitor: EosExhibitor;
    event: EosEvent;
  } | null>(null);
  const [formData, setFormData] = useState<Partial<EosExhibitor>>({});

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/exhibitors/portal/${token}`,
        );
        if (!res.ok) throw new Error("Invalid token");
        const json = await res.json();
        setData(json);
        setFormData({
          description: json.exhibitor.description || "",
          logoUrl: json.exhibitor.logoUrl || "",
          brochureUrl: json.exhibitor.brochureUrl || "",
          demoVideoUrl: json.exhibitor.demoVideoUrl || "",
          productImages: json.exhibitor.productImages || [],
        });
      } catch (e) {
        toast.error("Invalid or expired exhibitor access");
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/exhibitors/portal/${token}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update exhibitor info");
      }

      toast.success("Exhibitor profile updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const addProductImage = () => {
    setFormData({
      ...formData,
      productImages: [...(formData.productImages || []), ""],
    });
  };

  const updateProductImage = (index: number, val: string) => {
    const newImages = [...(formData.productImages || [])];
    newImages[index] = val;
    setFormData({ ...formData, productImages: newImages });
  };

  const removeProductImage = (index: number) => {
    setFormData({
      ...formData,
      productImages: (formData.productImages || []).filter(
        (_, i) => i !== index,
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground">Loading exhibitor dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-destructive">
          Access Restricted
        </h1>
        <p className="text-muted-foreground mt-2">
          This link is invalid or has been revoked.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Return to Hub
        </Button>
      </div>
    );
  }

  const { exhibitor, event } = data;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Store className="h-4 w-4" />
              <span>Partner Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {exhibitor.name}
            </h1>
            <p className="text-muted-foreground">
              Official Partner for <strong>{event.name}</strong>
            </p>
          </div>
          {formData.logoUrl && (
            <img
              src={formData.logoUrl}
              alt="Logo"
              className="h-16 w-16 object-contain rounded-md border bg-white p-1 shadow-sm"
            />
          )}
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Company Profile
              </CardTitle>
              <CardDescription>
                This information will be displayed to all event attendees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell attendees about your products and services..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Brand Logo URL</Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, logoUrl: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brochureUrl">Brochure PDF URL</Label>
                  <Input
                    id="brochureUrl"
                    placeholder="Link to your digital brochure"
                    value={formData.brochureUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, brochureUrl: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Portfolio & Media
              </CardTitle>
              <CardDescription>
                Showcase your products with images and video.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="demoVideoUrl"
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Demo Video URL (YouTube/Vimeo)
                </Label>
                <Input
                  id="demoVideoUrl"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.demoVideoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, demoVideoUrl: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Product Gallery (URLs)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProductImage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Image
                  </Button>
                </div>

                <div className="space-y-3">
                  {(formData.productImages || []).map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Image Link"
                        value={url}
                        onChange={(e) =>
                          updateProductImage(idx, e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductImage(idx)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(formData.productImages || []).length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        No images added yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-primary/20 p-2 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Ready for review?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Once saved, our event team will review your content. You can
                  continue making changes until the event starts.
                </p>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto px-10 shadow-lg shadow-primary/30"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <>
                  Save & Finalize
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
              Audience Engagement
            </CardTitle>
            <CardDescription>
              Interact with your booth visitors via polls and feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EngagementManager
              eventId={data.event.id}
              ownerId={exhibitor.id}
              ownerType="exhibitor"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
