
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { agentApi, TeamMember } from "@/lib/api/agent";
import { toast } from "sonner";
import { Loader2, Trash2, UserX, UserCheck, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManageTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onSuccess: () => void;
}

interface ExtendedTeamMember extends TeamMember {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  joinedAt: string;
}

export function ManageTeamDialog({ open, onOpenChange, teamId, teamName, onSuccess }: ManageTeamDialogProps) {
  const [members, setMembers] = useState<ExtendedTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await agentApi.getTeamMembers(teamId);
      // @ts-ignore - The API returns extended info but types need update
      setMembers(data);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, teamId]);

  const handleToggleStatus = async (member: ExtendedTeamMember) => {
    setProcessingId(member.userId);
    try {
      if (member.isActive) {
        await agentApi.disableTeamMember(teamId, member.userId);
        toast.success("Member disabled");
      } else {
        await agentApi.enableTeamMember(teamId, member.userId);
        toast.success("Member enabled");
      }
      fetchMembers();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };


  const handleDeactivateTeam = async () => {
    if (!confirm("Are you sure you want to deactivate this team? Members will be unassigned.")) return;
    try {
        await agentApi.disableTeam(teamId);
        toast.success("Team deactivated");
        onSuccess();
        onOpenChange(false);
    } catch (error) {
        toast.error("Failed to deactivate team");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Team: {teamName}</DialogTitle>
          <DialogDescription>
            Manage members and team status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                <span className="text-sm font-medium">Team Status</span>
                <Button variant="destructive" size="sm" onClick={handleDeactivateTeam}>
                    Deactivate Team
                </Button>
            </div>

            <div className="space-y-2">
                <h4 className="text-sm font-medium">Members</h4>
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin h-5 w-5" />
                    </div>
                ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No members in this team.</p>
                ) : (
                    <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${member.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm flex items-center gap-2">
                                            {member.name}
                                            {!member.isActive && <Badge variant="secondary" className="text-[10px] h-4">Disabled</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="mr-2">
                                        <Badge variant="outline" className="text-[10px]">
                                            {member.role === 'manager' ? <Shield className="w-3 h-3 mr-1"/> : null}
                                            {member.role}
                                        </Badge>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title={member.isActive ? "Disable Member" : "Enable Member"}
                                        onClick={() => handleToggleStatus(member)}
                                        disabled={!!processingId}
                                    >
                                        {processingId === member.userId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : member.isActive ? (
                                            <UserX className="h-4 w-4 text-amber-500" />
                                        ) : (
                                            <UserCheck className="h-4 w-4 text-green-500" />
                                        )}
                                    </Button>
                                    
                                    
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
