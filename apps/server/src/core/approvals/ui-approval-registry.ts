import { broadcastToUser } from "../../ws/handler";

type PendingApprovalValue = {
  action: string;
  payload?: Record<string, any>;
};

export type RegisterApprovalOptions = {
  username?: string;
  sessionId?: string;
  toolName?: string;
  args?: Record<string, any>;
  reason?: string;
  timeoutMs?: number;
};

export interface UiActionItem {
  approvalId: string;
  username: string;
  sessionId: string;
  toolName: string;
  args: Record<string, any>;
  reason: string;
  expiresAt: number;
  type: "question" | "ui_action";
}

type PendingUiAction = {
  item: UiActionItem;
  resolve: (value: PendingApprovalValue) => void;
  reject: (reason: Error | string) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export class UiApprovalRegistry {
  private pending = new Map<string, PendingUiAction>();

  register(toolCallId: string, options?: RegisterApprovalOptions): Promise<PendingApprovalValue> {
    const username = options?.username || "default_user";
    const sessionId = options?.sessionId || "default";
    const toolName = options?.toolName || "ask_question";
    const args = options?.args || {};
    const reason = options?.reason || "UI Action Request";
    const timeoutMs = options?.timeoutMs ?? 300000;
    const expiresAt = Date.now() + timeoutMs;

    const item: UiActionItem = {
      approvalId: toolCallId,
      username,
      sessionId,
      toolName,
      args,
      reason,
      expiresAt,
      type: toolName === "ask_question" ? "question" : "ui_action",
    };

    return new Promise<PendingApprovalValue>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(toolCallId);
        try {
          broadcastToUser(username, {
            type: "attention_item_resolved",
            approvalId: toolCallId,
          });
        } catch {
          // ignore
        }
        resolve({ action: "cancel" });
      }, timeoutMs);

      this.pending.set(toolCallId, {
        item,
        resolve,
        reject,
        timeoutId,
      });

      try {
        broadcastToUser(username, {
          type: "attention_item_created",
          item,
        });
      } catch (e) {
        console.error("Failed to broadcast attention item created:", e);
      }
    });
  }

  resolve(toolCallId: string, result: string | PendingApprovalValue): boolean {
    const entry = this.pending.get(toolCallId);
    if (!entry) return false;

    clearTimeout(entry.timeoutId);
    const resolvedValue: PendingApprovalValue =
      typeof result === "string" ? { action: result } : result;

    entry.resolve(resolvedValue);
    this.pending.delete(toolCallId);

    try {
      broadcastToUser(entry.item.username, {
        type: "attention_item_resolved",
        approvalId: toolCallId,
      });
    } catch (e) {
      console.error("Failed to broadcast attention item resolution:", e);
    }

    return true;
  }

  reject(toolCallId: string, error: any): boolean {
    const entry = this.pending.get(toolCallId);
    if (!entry) return false;

    clearTimeout(entry.timeoutId);
    entry.reject(error);
    this.pending.delete(toolCallId);

    try {
      broadcastToUser(entry.item.username, {
        type: "attention_item_resolved",
        approvalId: toolCallId,
      });
    } catch (e) {
      console.error("Failed to broadcast attention item rejection:", e);
    }

    return true;
  }

  getAll(username: string): UiActionItem[] {
    const items: UiActionItem[] = [];
    for (const entry of this.pending.values()) {
      if (entry.item.username === username) {
        items.push(entry.item);
      }
    }
    return items;
  }
}

export const uiApprovalRegistry = new UiApprovalRegistry();
