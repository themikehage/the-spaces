export interface ApprovalRequest {
  tool: string;
  args: unknown;
  sessionId?: string;
}

export interface IApprovalChannel {
  request(req: ApprovalRequest): Promise<boolean>;
}
