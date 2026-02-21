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
import { Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function ExhibitorOnboardingPage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    description: "",
    logoUrl: "",
  });
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/exhibitors/onboarding/${token}`,
        );
        if (!res.ok) throw new Error("Invalid token");
        const data = await res.json();
        setInfo(data.data);
      } catch (e) {
        toast.error("Invalid or expired invitation");
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/exhibitors/onboarding/${token}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      setComplete(true);
      toast.success("Profile saved! Waiting for organizer approval.");
    } catch (e) {
      toast.error("Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-destructive">
          Invitation Not Found
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

  if (complete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Profile Submitted!</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Thank you, <strong>{info.exhibitor.name}</strong>. Your profile for{" "}
          <strong>{info.event.name}</strong> has been submitted. The organizers
          will review and approve your listing shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          {info.event.coverImageUrl && (
            <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 shadow-lg">
              <Image
                src={info.event.coverImageUrl}
                alt={info.event.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            Exhibitor Onboarding
          </h1>
          <p className="text-muted-foreground">
            You&apos;ve been invited to exhibit at{" "}
            <strong>{info.event.name}</strong>
          </p>
        </div>

        <Card className="border-none shadow-xl bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Tell attendees about your products and services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Exhibitor Name</Label>
                <Input
                  value={info.exhibitor.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Contact person: {info.exhibitor.contactName}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, logoUrl: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">About Your Business</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you offer..."
                  className="min-h-[120px]"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Save & Submit Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
