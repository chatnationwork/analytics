"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { agentApi, TeamWrapUpReport } from "@/lib/api/agent";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [wrapUpEnabled, setWrapUpEnabled] = useState(false);
  const [wrapUpMandatory, setWrapUpMandatory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const wrapUpReport: TeamWrapUpReport | null = wrapUpEnabled
      ? { enabled: true, mandatory: wrapUpMandatory }
      : null;

    setIsSubmitting(true);
    try {
      await agentApi.createTeam(name, description, wrapUpReport);
      onSuccess();
      onOpenChange(false);
      setName("");
      setDescription("");
      setWrapUpEnabled(false);
      setWrapUpMandatory(false);
    } catch (error) {
      console.error("Failed to create team:", error);
      alert("Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your agents.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support, Sales"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the team"
              />
            </div>
            <div className="border rounded-md p-4 space-y-3">
              <Label className="text-sm font-medium">Wrap-up report</Label>
              <p className="text-xs text-muted-foreground">
                Agents can fill a short report when resolving a chat. You can
                make it mandatory for this team.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wrap-up-enabled"
                  checked={wrapUpEnabled}
                  onCheckedChange={(checked: boolean | string) =>
                    setWrapUpEnabled(!!checked)
                  }
                />
                <label
                  htmlFor="wrap-up-enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable wrap-up report for this team
                </label>
              </div>
              {wrapUpEnabled && (
                <div className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="wrap-up-mandatory"
                    checked={wrapUpMandatory}
                    onCheckedChange={(checked: boolean | string) =>
                      setWrapUpMandatory(!!checked)
                    }
                  />
                  <label
                    htmlFor="wrap-up-mandatory"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mandatory (agent must fill before resolving)
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
