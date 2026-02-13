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
import { agentApi, TeamMember, Team, WrapUpField, uploadMedia } from "@/lib/api/agent";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  UserX,
  UserCheck,
  Shield,
  User,
  Clock,
  Calendar,
  Plus,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed ScrollArea import

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
  /** Chats assigned to this member today. */
  assignedToday?: number;
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Get all valid IANA timezones
const SUPPORTED_TIMEZONES = Intl.supportedValuesOf("timeZone");

export function ManageTeamDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onSuccess,
}: ManageTeamDialogProps) {
  const [members, setMembers] = useState<ExtendedTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Schedule & Routing State
  const [scheduleConfig, setScheduleConfig] = useState<{
    timezone: string;
    enabled: boolean;
    outOfOfficeMessage: string;
    outOfOfficeImage?: string;
    routingStrategy: string;
    routingPriority: string[];
    routingSortBy: string;
    routingTimeWindow: string;
    maxLoad: number | "";
    days: Record<
      string,
      { enabled: boolean; shifts: Array<{ start: string; end: string }> }
    >;
  }>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enabled: false,
    outOfOfficeMessage: "We are currently closed.",
    outOfOfficeImage: "",
    routingStrategy: "round_robin",
    routingPriority: ["least_active", "least_assigned"],
    routingSortBy: "name",
    routingTimeWindow: "all_time",
    maxLoad: "" as number | "",
    days: DAYS.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { enabled: true, shifts: [{ start: "09:00", end: "17:00" }] },
      }),
      {},
    ),
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Wrap-up report state
  const [wrapUpEnabled, setWrapUpEnabled] = useState(false);
  const [wrapUpMandatory, setWrapUpMandatory] = useState(false);
  const [wrapUpFields, setWrapUpFields] = useState<WrapUpField[]>([]);
  const [savingWrapUp, setSavingWrapUp] = useState(false);

  const newFieldId = () => crypto.randomUUID();

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState(teamName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (open) {
      setEditingName(teamName);
      setIsRenaming(false);
    }
  }, [open, teamName]);

  const handleSaveName = async () => {
    if (!editingName.trim() || editingName === teamName) {
      setIsRenaming(false);
      return;
    }
    setSavingName(true);
    try {
      await agentApi.updateTeam(teamId, { name: editingName });
      toast.success("Team renamed");
      onSuccess();
      setIsRenaming(false);
    } catch (error) {
      toast.error("Failed to rename team");
    } finally {
      setSavingName(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersData, teamsData] = await Promise.all([
        agentApi.getTeamMembers(teamId),
        agentApi.getTeams(),
      ]);

      const team = teamsData.find((t) => t.id === teamId);

      // @ts-ignore
      setMembers(membersData);

      if (team && team.schedule) {
        const loadedDays = { ...scheduleConfig.days };

        Object.entries(team.schedule.days).forEach(([day, shifts]) => {
          if (shifts && shifts.length > 0) {
            loadedDays[day] = { enabled: true, shifts: shifts };
          } else {
            // If explicit empty array in DB, it implies disabled for that day
            // But we want to show at least one disabled shift row for UI
            loadedDays[day] = {
              enabled: false,
              shifts: [{ start: "09:00", end: "17:00" }],
            };
          }
        });

        setScheduleConfig({
          timezone: team.schedule.timezone || scheduleConfig.timezone,
          enabled: team.schedule.enabled ?? false,
          outOfOfficeMessage:
            team.schedule.outOfOfficeMessage ||
            scheduleConfig.outOfOfficeMessage,
          outOfOfficeImage: team.schedule.outOfOfficeImage || "",
          routingStrategy: team.routingStrategy || "round_robin",
          routingPriority: team.routingConfig?.priority || [
            "least_active",
            "least_assigned",
          ],
          routingSortBy: team.routingConfig?.sortBy || "name",
          routingTimeWindow: team.routingConfig?.timeWindow || "all_time",
          maxLoad:
            typeof team.routingConfig?.maxLoad === "number" &&
            team.routingConfig.maxLoad > 0
              ? team.routingConfig.maxLoad
              : "",
          days: loadedDays,
        });
      } else if (team) {
        setScheduleConfig((prev) => ({
          ...prev,
          routingStrategy: team.routingStrategy || "round_robin",
          routingPriority: team.routingConfig?.priority || [
            "least_active",
            "least_assigned",
          ],
          routingSortBy: team.routingConfig?.sortBy || "name",
          routingTimeWindow: team.routingConfig?.timeWindow || "all_time",
          maxLoad:
            typeof team.routingConfig?.maxLoad === "number" &&
            team.routingConfig.maxLoad > 0
              ? team.routingConfig.maxLoad
              : "",
        }));
      }

      if (team?.wrapUpReport) {
        setWrapUpEnabled(team.wrapUpReport.enabled);
        setWrapUpMandatory(team.wrapUpReport.mandatory ?? false);
        setWrapUpFields(team.wrapUpReport.fields ?? []);
      } else {
        setWrapUpEnabled(false);
        setWrapUpMandatory(false);
        setWrapUpFields([]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivateTeam = async () => {
    if (
      !confirm(
        "Are you sure you want to deactivate this team? Members will be unassigned.",
      )
    )
      return;
    try {
      await agentApi.disableTeam(teamId);
      toast.success("Team deactivated");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to deactivate team";
      toast.error(message);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      // Convert UI state to API format
      const daysApi: Record<string, Array<{ start: string; end: string }>> = {};
      Object.entries(scheduleConfig.days).forEach(([day, config]) => {
        if (config.enabled && config.shifts.length > 0) {
          daysApi[day] = config.shifts;
        } else {
          daysApi[day] = [];
        }
      });

      await agentApi.updateTeam(teamId, {
        schedule: {
          timezone: scheduleConfig.timezone,
          enabled: scheduleConfig.enabled,
          outOfOfficeMessage: scheduleConfig.outOfOfficeMessage,
          outOfOfficeImage: scheduleConfig.outOfOfficeImage,
          days: daysApi,
        },
        routingStrategy: scheduleConfig.routingStrategy,
        routingConfig: {
          priority: scheduleConfig.routingPriority,
          sortBy: scheduleConfig.routingSortBy,
          timeWindow: scheduleConfig.routingTimeWindow,
          maxLoad:
            typeof scheduleConfig.maxLoad === "number" &&
            scheduleConfig.maxLoad > 0
              ? scheduleConfig.maxLoad
              : undefined,
        },
      });
      toast.success("Schedule updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const addShift = (day: string) => {
    setScheduleConfig((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          shifts: [...prev.days[day].shifts, { start: "09:00", end: "13:00" }],
        },
      },
    }));
  };

  const removeShift = (day: string, index: number) => {
    setScheduleConfig((prev) => {
      const newShifts = [...prev.days[day].shifts];
      newShifts.splice(index, 1);
      return {
        ...prev,
        days: {
          ...prev.days,
          [day]: {
            ...prev.days[day],
            shifts: newShifts,
          },
        },
      };
    });
  };

  const updateShift = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setScheduleConfig((prev) => {
      const newShifts = [...prev.days[day].shifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return {
        ...prev,
        days: {
          ...prev.days,
          [day]: {
            ...prev.days[day],
            shifts: newShifts,
          },
        },
      };
    });
  };

  const handleSaveWrapUp = async () => {
    setSavingWrapUp(true);
    try {
      await agentApi.updateTeam(teamId, {
        wrapUpReport: wrapUpEnabled
          ? {
              enabled: true,
              mandatory: wrapUpMandatory,
              fields: wrapUpFields,
            }
          : null,
      });
      toast.success("Wrap-up report settings updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save wrap-up settings");
    } finally {
      setSavingWrapUp(false);
    }
  };

  const addWrapUpField = () => {
    setWrapUpFields((prev) => [
      ...prev,
      {
        id: newFieldId(),
        type: "text",
        label: "New field",
        required: false,
      },
    ]);
  };

  const removeWrapUpField = (id: string) => {
    setWrapUpFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateWrapUpField = (
    id: string,
    patch: Partial<
      Pick<WrapUpField, "type" | "label" | "required" | "placeholder">
    >,
  ) => {
    setWrapUpFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const addFieldOption = (fieldId: string) => {
    setWrapUpFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              options: [...(f.options ?? []), { value: "", label: "" }],
            }
          : f,
      ),
    );
  };

  const removeFieldOption = (fieldId: string, optionIndex: number) => {
    setWrapUpFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              options: (f.options ?? []).filter((_, i) => i !== optionIndex),
            }
          : f,
      ),
    );
  };

  const updateFieldOption = (
    fieldId: string,
    optionIndex: number,
    patch: { value?: string; label?: string },
  ) => {
    setWrapUpFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId || !f.options) return f;
        const next = [...f.options];
        next[optionIndex] = { ...next[optionIndex], ...patch };
        return { ...f, options: next };
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-1 w-full max-w-sm">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setIsRenaming(false)}
                  disabled={savingName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                Manage Team: {teamName}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground ml-2"
                  onClick={() => setIsRenaming(true)}
                  title="Rename team"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage members, team status, and working schedule.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="schedule">Schedule & Routing</TabsTrigger>
            <TabsTrigger value="wrapup">Wrap-up Report</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 py-4">
            <div className="flex justify-between items-center bg-muted/40 p-3 rounded-md">
              <span className="text-sm font-medium">Team Status</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeactivateTeam}
              >
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members in this team.
                </p>
              ) : (
                <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${member.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          <User size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {!member.isActive && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4"
                              >
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.email}
                          </div>
                          {typeof member.assignedToday === "number" && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Assigned today: {member.assignedToday}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="mr-2">
                          <Badge variant="outline" className="text-[10px]">
                            {member.role === "manager" ? (
                              <Shield className="w-3 h-3 mr-1" />
                            ) : null}
                            {member.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            member.isActive ? "Disable Member" : "Enable Member"
                          }
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
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 py-4">
            {/* --- Schedule Toggle --- */}
            <div className="flex items-center justify-between border rounded-md p-4 bg-slate-50 dark:bg-slate-900/20">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Schedule</Label>
                <div className="text-sm text-muted-foreground">
                  When enabled, chats outside working hours receive an away
                  message.
                </div>
              </div>
              <Checkbox
                checked={scheduleConfig.enabled}
                onCheckedChange={(checked) =>
                  setScheduleConfig((prev) => ({
                    ...prev,
                    enabled: !!checked,
                  }))
                }
              />
            </div>

            {scheduleConfig.enabled && (
              <div className="space-y-4 border rounded-md p-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-2">
                  <Label>Timezone</Label>
                  <Select
                    value={scheduleConfig.timezone}
                    onValueChange={(val) =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        timezone: val,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Away Message</Label>
                  <textarea
                    value={scheduleConfig.outOfOfficeMessage || ""}
                    onChange={(e) =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        outOfOfficeMessage: e.target.value,
                      }))
                    }
                    placeholder="We are currently closed."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sent to customers who message outside of working hours (if
                    tenant default isn&apos;t used).
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Away Message Image (Optional)</Label>
                  <div className="flex items-start gap-4">
                    {scheduleConfig.outOfOfficeImage ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={scheduleConfig.outOfOfficeImage}
                          alt="Out of office"
                          className="h-24 w-24 rounded-md object-cover border border-border"
                        />
                        <button
                          onClick={() =>
                            setScheduleConfig((prev) => ({
                              ...prev,
                              outOfOfficeImage: "",
                            }))
                          }
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
                        <span className="text-xs text-muted-foreground">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const { url } = await uploadMedia(file);
                              setScheduleConfig((prev) => ({
                                ...prev,
                                outOfOfficeImage: url,
                              }));
                            } catch (error) {
                              toast.error("Failed to upload image");
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <Label>Working Hours</Label>
                  <div className="space-y-3">
                    {DAYS.map((day) => {
                      const dayConfig = scheduleConfig.days[day];
                      return (
                        <div
                          key={day}
                          className="flex items-start gap-4 border-b pb-3 last:border-0"
                        >
                          <div className="w-32 pt-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={dayConfig.enabled}
                                onCheckedChange={(checked) =>
                                  setScheduleConfig((prev) => ({
                                    ...prev,
                                    days: {
                                      ...prev.days,
                                      [day]: {
                                        ...prev.days[day],
                                        enabled: !!checked,
                                      },
                                    },
                                  }))
                                }
                              />
                              <span className="capitalize text-sm font-medium">
                                {day}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            {dayConfig.enabled ? (
                              <>
                                {dayConfig.shifts.map((shift, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2"
                                  >
                                    <Input
                                      type="time"
                                      value={shift.start}
                                      onChange={(e) =>
                                        updateShift(
                                          day,
                                          idx,
                                          "start",
                                          e.target.value,
                                        )
                                      }
                                      className="w-24 h-8 text-xs"
                                    />
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                    <Input
                                      type="time"
                                      value={shift.end}
                                      onChange={(e) =>
                                        updateShift(
                                          day,
                                          idx,
                                          "end",
                                          e.target.value,
                                        )
                                      }
                                      className="w-24 h-8 text-xs"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeShift(day, idx)}
                                      disabled={dayConfig.shifts.length <= 1}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => addShift(day)}
                                >
                                  <Plus size={12} className="mr-1" /> Add Shift
                                </Button>
                              </>
                            ) : (
                              <div className="py-2 text-sm text-muted-foreground italic">
                                Closed
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                size="sm"
              >
                {savingSchedule ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Schedule & Routing
              </Button>
            </div>
            <div className="border rounded-md p-4 space-y-4 bg-slate-50 dark:bg-slate-900/20">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                Assignment Logic
              </h4>
              <div className="grid gap-2">
                <Label>Routing Strategy</Label>
                <Select
                  value={scheduleConfig.routingStrategy}
                  onValueChange={(val) =>
                    setScheduleConfig((prev) => ({
                      ...prev,
                      routingStrategy: val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">
                      Round Robin (Cyclical)
                    </SelectItem>
                    <SelectItem value="least_active">
                      Least Active (Optimize for Availability)
                    </SelectItem>
                    <SelectItem value="least_assigned">
                      Least Assigned (Load Balancing)
                    </SelectItem>
                    <SelectItem value="hybrid">
                      Hybrid (Custom Priority)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {scheduleConfig.routingStrategy === "round_robin" &&
                    "Assigns chats to agents in a standardized circular order."}
                  {scheduleConfig.routingStrategy === "least_active" &&
                    "Prioritizes agents with the fewest OPEN chats."}
                  {scheduleConfig.routingStrategy === "least_assigned" &&
                    "Prioritizes agents with the fewest TOTAL assignments (all time)."}
                  {scheduleConfig.routingStrategy === "hybrid" &&
                    "Uses a custom priority list. Falls back to Round Robin on ties."}
                </p>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">
                  Maximum concurrent chats per agent
                </Label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="No limit"
                  className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={
                    scheduleConfig.maxLoad === "" ? "" : scheduleConfig.maxLoad
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? "" : parseInt(v, 10);
                    setScheduleConfig((prev) => ({
                      ...prev,
                      maxLoad:
                        n === "" || Number.isNaN(n) ? "" : Math.max(1, n),
                    }));
                  }}
                  aria-label="Maximum concurrent chats per agent"
                />
                <p className="text-[10px] text-muted-foreground">
                  Agents at or above this many assigned chats are excluded from
                  new assignments. Leave empty for no limit.
                </p>
              </div>

              {scheduleConfig.routingStrategy === "round_robin" && (
                <div className="grid gap-2 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs">Order Agents By</Label>
                  <Select
                    value={scheduleConfig.routingSortBy}
                    onValueChange={(val) =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        routingSortBy: val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="created_at">
                        Join Date (Oldest First)
                      </SelectItem>
                      <SelectItem value="random">Random (ID)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scheduleConfig.routingStrategy === "least_assigned" && (
                <div className="grid gap-2 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs">Calculation Time Window</Label>
                  <Select
                    value={scheduleConfig.routingTimeWindow}
                    onValueChange={(val) =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        routingTimeWindow: val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shift">
                        Current Shift (Last 12h)
                      </SelectItem>
                      <SelectItem value="day">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="all_time">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scheduleConfig.routingStrategy === "hybrid" && (
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <Label className="text-xs">Priority Rules</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        Primary Metric
                      </Label>
                      <Select
                        value={scheduleConfig.routingPriority[0]}
                        onValueChange={(val) =>
                          setScheduleConfig((prev) => {
                            const newPriority = [...prev.routingPriority];
                            newPriority[0] = val;
                            return { ...prev, routingPriority: newPriority };
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="least_active">
                            Active Chats
                          </SelectItem>
                          <SelectItem value="least_assigned">
                            Total Assignments
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        Secondary Metric
                      </Label>
                      <Select
                        value={scheduleConfig.routingPriority[1]}
                        onValueChange={(val) =>
                          setScheduleConfig((prev) => {
                            const newPriority = [...prev.routingPriority];
                            newPriority[1] = val;
                            return { ...prev, routingPriority: newPriority };
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="least_active">
                            Active Chats
                          </SelectItem>
                          <SelectItem value="least_assigned">
                            Total Assignments
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>


            <Button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="w-full"
            >
              {savingSchedule ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Settings
            </Button>
          </TabsContent>

          <TabsContent value="wrapup" className="space-y-4 py-4">
            <div className="border rounded-md p-4 space-y-3">
              <h4 className="text-sm font-medium">Wrap-up report</h4>
              <p className="text-xs text-muted-foreground">
                Define the form agents fill when resolving a chat. Add, remove,
                or edit fields (select, text, textarea). You can make it
                mandatory for this team.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manage-wrap-up-enabled"
                  checked={wrapUpEnabled}
                  onCheckedChange={(checked: boolean | string) =>
                    setWrapUpEnabled(!!checked)
                  }
                />
                <label
                  htmlFor="manage-wrap-up-enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable wrap-up report for this team
                </label>
              </div>
              {wrapUpEnabled && (
                <>
                  <div className="flex items-center space-x-2 pl-6">
                    <Checkbox
                      id="manage-wrap-up-mandatory"
                      checked={wrapUpMandatory}
                      onCheckedChange={(checked: boolean | string) =>
                        setWrapUpMandatory(!!checked)
                      }
                    />
                    <label
                      htmlFor="manage-wrap-up-mandatory"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mandatory (agent must fill before resolving)
                    </label>
                  </div>
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Form fields</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addWrapUpField}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add field
                      </Button>
                    </div>
                    {wrapUpFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No fields yet. Add fields to define what agents fill in
                        when resolving a chat.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[320px] overflow-y-auto">
                        {wrapUpFields.map((field) => (
                          <div
                            key={field.id}
                            className="border rounded-md p-3 space-y-2 bg-muted/30"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 grid gap-2 grid-cols-1 sm:grid-cols-2">
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={(
                                      val: "select" | "text" | "textarea",
                                    ) =>
                                      updateWrapUpField(field.id, {
                                        type: val,
                                        ...(val === "select" && !field.options
                                          ? { options: [] }
                                          : {}),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="textarea">
                                        Text area
                                      </SelectItem>
                                      <SelectItem value="select">
                                        Dropdown
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) =>
                                      updateWrapUpField(field.id, {
                                        label: e.target.value,
                                      })
                                    }
                                    placeholder="Field label"
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeWrapUpField(field.id)}
                                aria-label="Remove field"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`required-${field.id}`}
                                checked={field.required}
                                onCheckedChange={(checked: boolean | string) =>
                                  updateWrapUpField(field.id, {
                                    required: !!checked,
                                  })
                                }
                              />
                              <label
                                htmlFor={`required-${field.id}`}
                                className="text-xs"
                              >
                                Required
                              </label>
                            </div>
                            {field.type === "text" && (
                              <div>
                                <Label className="text-xs">Placeholder</Label>
                                <Input
                                  value={field.placeholder ?? ""}
                                  onChange={(e) =>
                                    updateWrapUpField(field.id, {
                                      placeholder: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="Optional placeholder"
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            {field.type === "textarea" && (
                              <div>
                                <Label className="text-xs">Placeholder</Label>
                                <Input
                                  value={field.placeholder ?? ""}
                                  onChange={(e) =>
                                    updateWrapUpField(field.id, {
                                      placeholder: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="Optional placeholder"
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            {field.type === "select" && (
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Options (value / label)
                                </Label>
                                {(field.options ?? []).map((opt, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-2 items-center"
                                  >
                                    <Input
                                      value={opt.value}
                                      onChange={(e) =>
                                        updateFieldOption(field.id, idx, {
                                          value: e.target.value,
                                        })
                                      }
                                      placeholder="Value"
                                      className="h-8 text-sm flex-1"
                                    />
                                    <Input
                                      value={opt.label}
                                      onChange={(e) =>
                                        updateFieldOption(field.id, idx, {
                                          label: e.target.value,
                                        })
                                      }
                                      placeholder="Label"
                                      className="h-8 text-sm flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 h-8 w-8"
                                      onClick={() =>
                                        removeFieldOption(field.id, idx)
                                      }
                                      aria-label="Remove option"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-7 px-0 text-xs"
                                  onClick={() => addFieldOption(field.id)}
                                >
                                  + Add option
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={handleSaveWrapUp}
              disabled={savingWrapUp}
              className="w-full"
            >
              {savingWrapUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Wrap-up Settings
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
