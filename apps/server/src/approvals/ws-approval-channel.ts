import type { ApprovalRequest, IApprovalChannel } from "@spaces/core";

export class WsApprovalChannel implements IApprovalChannel {
  private pendingRequests = new Map<string, (approved: boolean) => void>();

  async request(req: ApprovalRequest): Promise<boolean> {
    const requestId = crypto.randomUUID();
    return new Promise<boolean>((resolve) => {
      this.pendingRequests.set(requestId, resolve);
      console.log(`[Approval Request ${requestId}] Pending approval for tool: ${req.tool}`);
    });
  }

  resolveRequest(requestId: string, approved: boolean): boolean {
    const resolver = this.pendingRequests.get(requestId);
    if (!resolver) return false;
    resolver(approved);
    this.pendingRequests.delete(requestId);
    return true;
  }
}
