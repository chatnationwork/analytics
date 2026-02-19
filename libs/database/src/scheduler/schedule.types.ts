
export enum ScheduleStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface CreateScheduleDto {
  tenantId: string;
  jobType: string;
  jobPayload: Record<string, unknown>;
  cronExpression?: string | null;
  scheduledAt?: Date | string | null;
  maxRuns?: number | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export interface UpdateScheduleDto {
  cronExpression?: string | null;
  scheduledAt?: Date | string | null;
  jobPayload?: Record<string, unknown>;
  maxRuns?: number | null;
  status?: ScheduleStatus;
  metadata?: Record<string, unknown> | null;
}

export type ScheduleJobHandler = (
  tenantId: string,
  payload: Record<string, unknown>,
  scheduleId?: string,
) => Promise<void>;
