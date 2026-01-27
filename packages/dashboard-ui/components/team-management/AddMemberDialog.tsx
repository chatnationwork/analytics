
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agentApi } from "@/lib/api/agent";
import { toast } from "sonner"; // Assuming sonner is used, or alert based on existing code

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onSuccess: () => void;
}

export function AddMemberDialog({ open, onOpenChange, teamId, teamName, onSuccess }: AddMemberDialogProps) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("agent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsSubmitting(true);
    try {
      await agentApi.addMember(teamId, userId, role);
      onSuccess();
      onOpenChange(false);
      setUserId("");
      setRole("member");
      toast.success("Member added successfully");
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member"); // Fallback if toast not available in this scope? The file didn't show toast import but usage implies it might be needed.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member to {teamName}</DialogTitle>
          <DialogDescription>
            Enter the Email Address of the agent you want to add to this team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="userId">User Email</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user@example.com"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                User must already exist. {' '}
                <a href="/settings" target="_blank" className="text-primary hover:underline">
                  Invite new users here
                </a>.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Team Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent (Handle Chats)</SelectItem>
                  <SelectItem value="manager">Manager (Manage Team)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
