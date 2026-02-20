"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicEngagementWidget } from "@/components/eos-events/PublicEngagementWidget";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PublicEngagementPage() {
  const params = useParams();
  const type = params.type as "event" | "exhibitor" | "speaker";
  const id = params.id as string;
  const [target, setTarget] = useState<{ name: string; type: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTarget() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/eos/public/engagement/target/${type}/${id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTarget(data);
        }
      } catch (e) {
        console.error("Failed to fetch target info", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTarget();
  }, [type, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 px-4 bg-muted/20">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Setting up interaction...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-12">
      {/* Target Brand Header */}
      <div className="bg-primary text-primary-foreground py-10 px-6 rounded-b-[2rem] shadow-lg mb-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground/70 hover:text-primary-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              Interactive Session
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {target?.name || "Event Engagement"}
            </h1>
            <p className="text-primary-foreground/70 font-medium">
              {type === "event"
                ? "Official Event Interaction"
                : type === "exhibitor"
                  ? "Exhibitor Interaction"
                  : "Speaker Interaction"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Engagement Widget */}
      <div className="max-w-md mx-auto px-4">
        <PublicEngagementWidget
          eventId="" // We might want to pass real eventId if known
          targetId={id}
          targetType={type}
        />
      </div>

      <div className="max-w-md mx-auto mt-12 px-6 text-center space-y-6">
        <div className="h-px bg-muted mx-auto w-24"></div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your feedback and poll responses help us create a better experience
          for everyone. Thank you for being an active part of this event.
        </p>
      </div>
    </div>
  );
}
