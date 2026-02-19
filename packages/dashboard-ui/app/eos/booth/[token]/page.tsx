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
import { Loader2, QrCode, User, ScanLine, ArrowLeft } from "lucide-react";

export default function BoothScannerPage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [ticketCode, setTicketCode] = useState("");
  const [notes, setNotes] = useState("");
  const [lastLead, setLastLead] = useState<any>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/eos/public/exhibitors/booth/${token}`,
        );
        if (!res.ok) throw new Error("Invalid token");
        const data = await res.json();
        setInfo(data);
      } catch (e) {
        toast.error("Invalid or expired booth access");
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/eos/public/exhibitors/booth/${token}/capture-lead`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketCode, notes }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to capture lead");
      }

      const lead = await res.json();
      setLastLead(lead);
      setTicketCode("");
      setNotes("");
      toast.success("Lead captured successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to capture lead");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground">Loading booth info...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-destructive">Booth Not Found</h1>
        <p className="text-muted-foreground mt-2">
          This link may have expired or is incorrect.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{info.exhibitor.name}</h1>
            <p className="text-xs text-muted-foreground">
              Booth {info.exhibitor.boothNumber} • {info.event.name}
            </p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Scan Attendee
            </CardTitle>
            <CardDescription>
              Enter the ticket code or scan the QR code to capture a lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCapture} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketCode">Ticket Code</Label>
                <div className="relative">
                  <Input
                    id="ticketCode"
                    placeholder="e.g. ABC12345"
                    value={ticketCode}
                    onChange={(e) =>
                      setTicketCode(e.target.value.toUpperCase())
                    }
                    className="pl-9 font-mono uppercase"
                    required
                  />
                  <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Interested in bulk order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Capture Lead"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {lastLead && (
          <Card className="border-green-500/30 bg-green-500/5 animate-in fade-in slide-in-from-bottom-2">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-full">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Lead Captured!</p>
                <p className="text-xs text-muted-foreground">
                  Follow-up campaign will be triggered if active.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
