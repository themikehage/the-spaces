import { z } from "zod";

export const ScheduleModeSchema = z.enum(["interval", "cron"]);
export type ScheduleMode = z.infer<typeof ScheduleModeSchema>;

export const ScheduleRunStatusSchema = z.enum(["running", "completed", "failed", "cancelled"]);
export type ScheduleRunStatus = z.infer<typeof ScheduleRunStatusSchema>;

export const ScheduleJobSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  preserveSession: z.boolean().optional().default(true),
  scheduleMode: ScheduleModeSchema,
  intervalMinutes: z.number().nullable().optional(),
  cronExpression: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  prompt: z.string(),
  modelId: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastRunAt: z.number().nullable().optional(),
  nextRunAt: z.number().nullable().optional(),
});
export type ScheduleJob = z.infer<typeof ScheduleJobSchema>;

export const CreateScheduleJobBaseSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().optional().default(true),
  preserveSession: z.boolean().optional().default(true),
  scheduleMode: ScheduleModeSchema,
  intervalMinutes: z.number().min(1).max(10080).optional(),
  cronExpression: z.string().optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  prompt: z.string().min(1).max(20000),
  modelId: z.string().optional(),
});

export const CreateScheduleJobSchema = CreateScheduleJobBaseSchema.refine(
  (data) => {
    if (data.scheduleMode === "interval") {
      return typeof data.intervalMinutes === "number" && data.intervalMinutes > 0;
    }
    if (data.scheduleMode === "cron") {
      return typeof data.cronExpression === "string" && data.cronExpression.trim().length > 0;
    }
    return true;
  },
  {
    message:
      "intervalMinutes is required for interval mode, cronExpression is required for cron mode",
  },
);
export type CreateScheduleJob = z.input<typeof CreateScheduleJobSchema>;

export const UpdateScheduleJobSchema = CreateScheduleJobBaseSchema.partial();
export type UpdateScheduleJob = z.infer<typeof UpdateScheduleJobSchema>;

export const ScheduleRunSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  username: z.string(),
  triggerSource: z.enum(["manual", "schedule"]),
  status: ScheduleRunStatusSchema,
  sessionId: z.string().nullable().optional(),
  startedAt: z.number(),
  finishedAt: z.number().nullable().optional(),
  responseText: z.string().nullable().optional(),
  errorText: z.string().nullable().optional(),
  createdAt: z.number(),
});
export type ScheduleRun = z.infer<typeof ScheduleRunSchema>;
