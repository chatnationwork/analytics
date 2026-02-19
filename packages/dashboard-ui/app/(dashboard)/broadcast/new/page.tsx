"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Save, Calendar, Users, MessageSquare, Check, Loader2, FileText, Type } from "lucide-react";
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
import { templatesApi, Template } from "@/lib/templates-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  
  // Message Config
  const [messageType, setMessageType] = useState<"text" | "template">("text");
  const [messageBody, setMessageBody] = useState("");
  
  // Template Config
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  const [scheduledAt, setScheduledAt] = useState("");
  const [filter, setFilter] = useState<AudienceFilter>({ conditions: [], logic: "AND" });
  
  // Preview State
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await templatesApi.list();
        setTemplates(data);
      } catch (error) {
        console.error("Failed to load templates", error);
        toast.error("Failed to load templates");
      }
    };
    loadTemplates();
  }, []);

  // Update selected template object when ID changes
  useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find(t => t.id === selectedTemplateId) || null;
      setSelectedTemplate(t);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  // Reset params when template changes
  useEffect(() => {
    if (selectedTemplate) {
       const params: Record<string, string> = {};
       selectedTemplate.variables.forEach(v => {
           params[v] = "";
       });
       setTemplateParams(params);
    } else {
       setTemplateParams({});
    }
  }, [selectedTemplate]);

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

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [monthOfYear, setMonthOfYear] = useState<number>(0);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const payload: CreateCampaignDto = {
        name,
        type,
        audienceFilter: filter,
        scheduledAt: type === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      if (messageType === "template" && selectedTemplateId) {
          payload.templateId = selectedTemplateId;
          payload.templateParams = templateParams;
          // messageTemplate is optional now in DTO if templateId is present
      } else {
          payload.messageTemplate = { type: "text", text: { body: messageBody } };
      }

      if (type === "scheduled" && isRecurring && scheduledAt) {
        const date = new Date(scheduledAt);
        const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        payload.recurrence = {
          frequency,
          startDate: new Date(scheduledAt).toISOString(),
          endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
          time,
          daysOfWeek: frequency === "weekly" ? selectedDays : undefined,
          dayOfMonth: (frequency === "monthly" || frequency === "yearly") ? dayOfMonth : undefined,
          monthOfYear: frequency === "yearly" ? monthOfYear : undefined,
        };
      }

      const campaign = await broadcastApi.createCampaign(payload);

      if (type === "manual") {
        await broadcastApi.sendCampaign(campaign.id);
        toast.success("Campaign launched!", { description: "Messages are being queued." });
      } else if (type === "scheduled" && scheduledAt && !isRecurring) {
        // Ensure one-time scheduled campaigns are promoted to SCHEDULED status
        await broadcastApi.scheduleCampaign(campaign.id, new Date(scheduledAt).toISOString());
        toast.success("Campaign scheduled!", {
          description: `Will run on ${new Date(scheduledAt).toLocaleString()}.`,
        });
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

  const handleParamChange = (variable: string, value: string) => {
      setTemplateParams(prev => ({
          ...prev,
          [variable]: value
      }));
  };

  const handleInsertParamPlaceholder = (variable: string, placeholder: string) => {
      const current = templateParams[variable] || "";
      // Simple append for now as we don't have refs for each input
      handleParamChange(variable, current + placeholder);
  };

  const isStepValid = () => {
    if (step === 1) {
        const isDetailsValid = name.trim().length > 0 && (type !== "scheduled" || scheduledAt);
        const isMessageValid = messageType === "text" 
            ? messageBody.trim().length > 0 
            : !!selectedTemplateId;
        return isDetailsValid && isMessageValid;
    }
    if (step === 2) return true; // Empty filter = all contacts (valid but maybe warn?)
    return true;
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
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
                           <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <Label>Start Date & Time</Label>
                                   <Input 
                                     type="datetime-local" 
                                     value={scheduledAt} 
                                     onChange={e => setScheduledAt(e.target.value)} 
                                   />
                                </div>
                                <div className="space-y-2">
                                  <Label>End Date (Optional)</Label>
                                  <Input 
                                     type="datetime-local" 
                                     value={recurrenceEndDate} 
                                     onChange={e => setRecurrenceEndDate(e.target.value)}
                                     disabled={!isRecurring}
                                   />
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 pt-2">
                                <input 
                                  type="checkbox" 
                                  id="recurring" 
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={isRecurring}
                                  onChange={(e) => setIsRecurring(e.target.checked)}
                                />
                                <Label htmlFor="recurring" className="font-medium cursor-pointer">Repeat this campaign</Label>
                              </div>

                              {isRecurring && (
                                <div className="space-y-4 pt-2 border-t mt-2 animate-in fade-in slide-in-from-top-2">
                                  <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    <div className="flex gap-2">
                                      {["daily", "weekly", "monthly", "yearly"].map((f) => (
                                        <Button 
                                          key={f} 
                                          variant={frequency === f ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setFrequency(f as any)}
                                          className="capitalize"
                                        >
                                          {f}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  {frequency === "weekly" && (
                                    <div className="space-y-2">
                                      <Label>Repeat On</Label>
                                      <div className="flex gap-1 flex-wrap">
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                                          <Button
                                            key={d}
                                            variant={selectedDays.includes(i) ? "default" : "outline"}
                                            size="icon"
                                            className="w-8 h-8 rounded-full text-xs"
                                            onClick={() => toggleDay(i)}
                                          >
                                            {d[0]}
                                          </Button>
                                        ))}
                                      </div>
                                      <p className="text-xs text-muted-foreground">Select days of the week</p>
                                    </div>
                                  )}

                                  {(frequency === "monthly" || frequency === "yearly") && (
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <Label>Day of Month</Label>
                                          <Input 
                                            type="number" 
                                            min={1} 
                                            max={31} 
                                            value={dayOfMonth} 
                                            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                                          />
                                       </div>
                                       {frequency === "yearly" && (
                                         <div className="space-y-2">
                                            <Label>Month</Label>
                                            <select 
                                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              value={monthOfYear}
                                              onChange={(e) => setMonthOfYear(parseInt(e.target.value))}
                                            >
                                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                <option key={m} value={i}>{m}</option>
                                              ))}
                                            </select>
                                         </div>
                                       )}
                                    </div>
                                  )}
                                  
                                  <p className="text-sm text-muted-foreground bg-blue-50 text-blue-800 p-2 rounded border border-blue-100">
                                    Summary: Repeats <span className="font-semibold capitalize">{frequency}</span>
                                    {frequency === "weekly" && selectedDays.length > 0 && ` on ${selectedDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}`}
                                    {frequency === "monthly" && ` on day ${dayOfMonth}`}
                                    {frequency === "yearly" && ` on ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthOfYear]} ${dayOfMonth}`}
                                    {` at ${scheduledAt ? new Date(scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'selected time'}`}
                                  </p>
                                </div>
                              )}
                           </div>
                        )}

                        <Separator />


                        <div className="space-y-2">
                           <Label>Message Type</Label>
                           <RadioGroup value={messageType} onValueChange={(v) => setMessageType(v as any)} className="grid grid-cols-2 gap-4">
                            <div className={`border rounded-lg p-4 cursor-pointer hover:bg-accent ${messageType === "text" ? "border-primary bg-accent/50" : ""}`} onClick={() => setMessageType("text")}>
                                <RadioGroupItem value="text" className="sr-only" />
                                <div className="flex items-center gap-2 mb-1">
                                    <Type className="h-4 w-4" />
                                    <div className="font-semibold">Custom Text</div>
                                </div>
                                <div className="text-sm text-muted-foreground">Write a one-off message manually</div>
                            </div>
                            <div className={`border rounded-lg p-4 cursor-pointer hover:bg-accent ${messageType === "template" ? "border-primary bg-accent/50" : ""}`} onClick={() => setMessageType("template")}>
                                <RadioGroupItem value="template" className="sr-only" />
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4" />
                                    <div className="font-semibold">Template</div>
                                </div>
                                <div className="text-sm text-muted-foreground">Select a pre-approved WhatsApp template</div>
                            </div>
                           </RadioGroup>
                        </div>
                        
                        {messageType === "text" ? (
                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
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
                        ) : (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <Label>Select Template</Label>
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} ({t.language})
                                                </SelectItem>
                                            ))}
                                            {templates.length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    No templates found. <Link href="/settings/templates" className="underline text-primary">Create one</Link>
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedTemplate && (
                                    <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold">Preview</Label>
                                            <Badge variant="outline">{selectedTemplate.language}</Badge>
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded border">
                                            {selectedTemplate.bodyText || "No preview text available."}
                                        </div>
                                        {selectedTemplate.variables?.length > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                Detected variables: {selectedTemplate.variables.map(v => `{{${v}}}`).join(", ")}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTemplate && selectedTemplate.variables?.length > 0 && (
                                    <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                        <Label className="text-sm font-semibold">Template Variables</Label>
                                        <div className="grid gap-4">
                                            {selectedTemplate.variables.map(v => (
                                                <div key={v} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-xs text-muted-foreground uppercase">Variable {'{{' + v + '}}'}</Label>
                                                        <PlaceholderSelector 
                                                            onInsert={(val) => handleInsertParamPlaceholder(v, val)} 
                                                        />
                                                    </div>
                                                    <Input 
                                                        value={templateParams[v] || ""} 
                                                        onChange={(e) => handleParamChange(v, e.target.value)}
                                                        placeholder={`Enter value for {{${v}}}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                              {isRecurring && type === "scheduled" && (
                                <div className="col-span-2 border-t pt-2 mt-2">
                                   <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Recurrence</div>
                                   <div className="font-medium">
                                      Repeats <span className="capitalize">{frequency}</span>
                                      {frequency === "weekly" && selectedDays.length > 0 && ` on ${selectedDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}`}
                                      {frequency === "monthly" && ` on day ${dayOfMonth}`}
                                      {frequency === "yearly" && ` on ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthOfYear]} ${dayOfMonth}`}
                                      {recurrenceEndDate && ` until ${new Date(recurrenceEndDate).toLocaleDateString()}`}
                                   </div>
                                </div>
                              )}
                           </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-2">
                           <h4 className="font-medium text-sm">Message Content</h4>
                           {messageType === "text" ? (
                                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border">
                                    {messageBody}
                                </div>
                           ) : (
                                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border">
                                    <Badge variant="secondary" className="mb-2">Template: {selectedTemplate?.name}</Badge>
                                    <div>{selectedTemplate?.bodyText}</div>
                                </div>
                           )}
                           
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
