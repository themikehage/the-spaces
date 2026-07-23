import type { EnvelopeResult } from "shared";
import type { ManageDelegationsOptions } from "./tools/manage-delegations-tool";

export interface DelegationRequest {
  action: "spawn" | "delegate";
  targetType?: "agent" | "project" | "team" | "session";
  targetId?: string;
  task: string;
  subagentRole?: string;
  subagentType?: "explorer" | "builder" | "autonomous";
  maxSteps?: number;
  includeFullHistory?: boolean;
  model?: string;
  autonomyMode?: "read-only" | "standard" | "autonomous";
  payload?: Record<string, unknown>;
}

export class DelegationService {
  constructor(private options: ManageDelegationsOptions) {}

  async execute(toolCallId: string, req: DelegationRequest, parentSignal?: AbortSignal): Promise<EnvelopeResult | string> {
    // The underlying execution delegate implementation
    const { createManageDelegationsTool } = await import("./tools/manage-delegations-tool");
    const tool = createManageDelegationsTool(this.options);
    return tool.execute(toolCallId, req, parentSignal);
  }
}
