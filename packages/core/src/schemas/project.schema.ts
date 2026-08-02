// SPDX-License-Identifier: MIT
import { z } from "zod";

export const ProjectStatusSchema = z.enum(["planning", "running", "review", "done"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectAssignmentMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});
export type ProjectAssignmentMember = z.infer<typeof ProjectAssignmentMemberSchema>;

export const ProjectAssignmentSchema = z.object({
  leaderId: z.string().optional().nullable(),
  members: z.array(ProjectAssignmentMemberSchema).default([]),
  updatedAt: z.string().optional(),
});
export type ProjectAssignment = z.infer<typeof ProjectAssignmentSchema>;

export const UpdateProjectAssignmentSchema = z.object({
  leaderId: z.string().optional().nullable(),
  members: z.array(ProjectAssignmentMemberSchema).optional(),
});
export type UpdateProjectAssignment = z.infer<typeof UpdateProjectAssignmentSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  cloneUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  status: ProjectStatusSchema.default("planning").optional(),
  createdAt: z.string(),
  assignment: ProjectAssignmentSchema.optional().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  path: z.string().optional(),
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
