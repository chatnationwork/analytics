"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { templatesApi, Template } from "@/lib/templates-api";
import { eventsApi } from "@/lib/eos-events-api";
import { EosEvent } from "@/types/eos-events";
import { toast } from "sonner";
import { Loader2, Users, Send, AlertCircle } from "lucide-react";

interface InviteModalProps {
  event: EosEvent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InviteModal({
  event,
  isOpen,
  onClose,
  onSuccess,
}: InviteModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [audienceType, setAudienceType] = useState<"all" | "tags">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Pre-fill some defaults if variables are detected
      setTemplateParams({
        eventName: event.name,
        eventDate: new Date(event.startsAt).toLocaleDateString(),
        venue: event.venueName || "Venue TBA",
      });
    }
  }, [isOpen, event]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await templatesApi.list();
      setTemplates(data.filter((t) => t.status === "approved"));
    } catch (err) {
      toast.error("Failed to load WhatsApp templates");
    } finally {
      setLoading(false);
    }
  }

  const handleAddTag = () => {
    if (tagInput && !selectedTags.includes(tagInput)) {
      setSelectedTags([...selectedTags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    setSending(true);
    try {
      const audienceFilter =
        audienceType === "tags" && selectedTags.length > 0
          ? {
              logic: "OR",
              conditions: selectedTags.map((tag) => ({
                field: "tags",
                operator: "contains",
                value: tag,
              })),
            }
          : undefined;

      await eventsApi.sendInvites(event.id, {
        name: `Invite: ${event.name} - ${new Date().toLocaleDateString()}`,
        templateId: selectedTemplateId,
        audienceFilter,
        templateParams,
      });

      toast.success("Invitation campaign launched successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to launch invitation campaign");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Event Invitations</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>WhatsApp Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an approved template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
          </div>

          {/* Template Variables */}
          {selectedTemplate && selectedTemplate.variables?.length > 0 && (
            <div className="space-y-3 p-3 bg-muted rounded-md">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Template Variables
              </Label>
              {selectedTemplate.variables.map((v) => (
                <div key={v} className="space-y-1">
                  <Label htmlFor={`var-${v}`} className="text-xs">
                    Variable {v}
                  </Label>
                  <Input
                    id={`var-${v}`}
                    value={templateParams[v] || ""}
                    onChange={(e) =>
                      setTemplateParams({
                        ...templateParams,
                        [v]: e.target.value,
                      })
                    }
                    placeholder={`Value for ${v}`}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Audience Selection */}
          <div className="space-y-3">
            <Label>Target Audience</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all"
                  checked={audienceType === "all"}
                  onCheckedChange={() => setAudienceType("all")}
                />
                <label htmlFor="all" className="text-sm">
                  All Contacts
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tags"
                  checked={audienceType === "tags"}
                  onCheckedChange={() => setAudienceType("tags")}
                />
                <label htmlFor="tags" className="text-sm">
                  Filter by Tags
                </label>
              </div>
            </div>

            {audienceType === "tags" && (
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter tag (e.g. VIP)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
            <div className="flex gap-2 text-blue-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>
                This will create a new campaign in the Broadcast module. Recipient
                counts and delivery tracking will be available in the Invitations tab.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !selectedTemplateId}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Launch Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
