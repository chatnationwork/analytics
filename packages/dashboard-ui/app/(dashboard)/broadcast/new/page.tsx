"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Save, Calendar, Users, MessageSquare, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AudienceFilterBuilder } from "../components/AudienceFilterBuilder";
import { AudiencePreviewCard } from "../components/AudiencePreviewCard";
import { broadcastApi } from "@/lib/broadcast-api";
import { CreateCampaignDto, AudienceFilter, AudiencePreview, CampaignType } from "@/lib/broadcast-types";
import { PlaceholderSelector } from "@/components/broadcast/PlaceholderSelector";
import { MessagePreview } from "@/components/broadcast/MessagePreview";

// Steps
const STEPS = [
  { id: 1, label: "Details", icon: MessageSquare },
  { id: 2, label: "Audience", icon: Users },
  { id: 3, label: "Review", icon: Check },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("manual");
  const [messageBody, setMessageBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [filter, setFilter] = useState<AudienceFilter>({ conditions: [], logic: "AND" });
  
  // Preview State
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 1000);
    return () => clearTimeout(timer);
  }, [filter]);

  async function fetchPreview() {
    try {
      setPreviewLoading(true);
      const res = await broadcastApi.previewAudience(filter);
      setPreview(res);
    } catch (error) {
      console.error("Preview error:", error);
    } finally {
      setPreviewLoading(false);
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const payload: CreateCampaignDto = {
        name,
        type,
        messageTemplate: { type: "text", text: { body: messageBody } }, // Simple text message for now
        audienceFilter: filter,
        scheduledAt: type === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      const campaign = await broadcastApi.createCampaign(payload);
      
      if (type === "manual") {
        await broadcastApi.sendCampaign(campaign.id);
        toast.success("Campaign launched!", { description: "Messages are being queued." });
      } else {
        toast.success("Campaign created", { description: "Your campaign has been saved." });
      }

      router.push("/broadcast");
    } catch (error: any) {
      toast.error("Error", { 
        description: error.message || "Failed to create campaign" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback if ref not set: append to end
      setMessageBody(prev => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageBody;

    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + placeholder + after;

    setMessageBody(newText);

    // Restore cursor position after placeholder
    setTimeout(() => {
      const newCursorPos = start + placeholder.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const isStepValid = () => {
    if (step === 1) return name.trim().length > 0 && messageBody.trim().length > 0 && (type !== "scheduled" || scheduledAt);
    if (step === 2) return true; // Empty filter = all contacts (valid but maybe warn?)
    return true;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/broadcast"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
           <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
           <p className="text-muted-foreground">Create a new broadcast message</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
         <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                 <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${step === s.id ? "bg-primary text-primary-foreground border-primary" : step > s.id ? "bg-muted text-muted-foreground" : "text-muted-foreground border-transparent"}`}>
                    <s.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{s.label}</span>
                 </div>
                 {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
              </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Main Form Area */}
         <div className="md:col-span-2 space-y-6">
            <Card>
               <CardContent className="pt-6">
                  {step === 1 && (
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <Label>Campaign Name</Label>
                           <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. October Newsletter" />
                        </div>

                        <div className="space-y-2">
                           <Label>Campaign Type</Label>
                           <RadioGroup value={type} onValueChange={(v) => setType(v as CampaignType)} className="grid grid-cols-2 gap-4">
                              <div className={`border rounded-lg p-4 cursor-pointer hover:bg-accent ${type === "manual" ? "border-primary bg-accent/50" : ""}`} onClick={() => setType("manual")}>
                                 <RadioGroupItem value="manual" className="sr-only" />
                                 <div className="font-semibold mb-1">Send Now</div>
                                 <div className="text-sm text-muted-foreground">Broadcast immediately to selected audience</div>
                              </div>
                              <div className={`border rounded-lg p-4 cursor-pointer hover:bg-accent ${type === "scheduled" ? "border-primary bg-accent/50" : ""}`} onClick={() => setType("scheduled")}>
                                 <RadioGroupItem value="scheduled" className="sr-only" />
                                 <div className="font-semibold mb-1">Schedule</div>
                                 <div className="text-sm text-muted-foreground">Pick a future date and time</div>
                              </div>
                           </RadioGroup>
                        </div>

                        {type === "scheduled" && (
                           <div className="space-y-2">
                              <Label>Schedule Date</Label>
                              <div className="flex gap-2">
                                 <Input 
                                   type="datetime-local" 
                                   value={scheduledAt} 
                                   onChange={e => setScheduledAt(e.target.value)} 
                                 />
                              </div>
                           </div>
                        )}

                        <div className="space-y-2">
                           <Label>Message Content</Label>
                           <PlaceholderSelector onInsert={handleInsertPlaceholder} />
                           <Textarea 
                             ref={textareaRef}
                             value={messageBody} 
                             onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageBody(e.target.value)} 
                             placeholder="Hello {{name}}, check out our latest updates..." 
                             rows={6} 
                           />
                           <p className="text-xs text-muted-foreground">Supports generic text templates for now.</p>
                           
                           {/* Live Preview */}
                           {messageBody.length > 0 && <MessagePreview message={messageBody} />}
                        </div>
                     </div>
                  )}

                  {step === 2 && (
                     <AudienceFilterBuilder value={filter} onChange={setFilter} />
                  )}

                  {step === 3 && preview && (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           <h3 className="font-semibold text-lg">Campaign Summary</h3>
                           <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                              <div>
                                 <div className="text-muted-foreground">Name</div>
                                 <div className="font-medium">{name}</div>
                              </div>
                              <div>
                                 <div className="text-muted-foreground">Type</div>
                                 <div className="font-medium capitalize">{type}</div>
                              </div>
                              <div>
                                 <div className="text-muted-foreground">Recipients</div>
                                 <div className="font-medium">{preview.total.toLocaleString()}</div>
                              </div>
                              <div>
                                 <div className="text-muted-foreground">Target Launch</div>
                                 <div className="font-medium">
                                    {type === "scheduled" && scheduledAt ? new Date(scheduledAt).toLocaleString() : "Immediately"}
                                 </div>
                              </div>
                           </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-2">
                           <h4 className="font-medium text-sm">Message Preview</h4>
                           <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border">
                              {messageBody}
                           </div>
                        </div>
                     </div>
                  )}
               </CardContent>
            </Card>

            <div className="flex justify-between">
               <Button 
                 variant="outline" 
                 onClick={() => setStep(s => s - 1)} 
                 disabled={step === 1 || submitting}
               >
                 Back
               </Button>

               {step < 3 ? (
                 <Button onClick={() => setStep(s => s + 1)} disabled={!isStepValid()}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               ) : (
                 <Button onClick={handleSubmit} disabled={submitting || !preview || (preview.outOfWindow > (preview.quotaStatus?.remaining ?? 0))}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {type === "scheduled" ? "Schedule Campaign" : "Launch Campaign"}
                 </Button>
               )}
            </div>
         </div>

         {/* Sidebar Preview */}
         <div className="space-y-6">
            <AudiencePreviewCard preview={preview} loading={previewLoading} />
         </div>
      </div>
    </div>
  );
}
