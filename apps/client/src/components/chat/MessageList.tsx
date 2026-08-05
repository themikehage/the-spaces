// SPDX-License-Identifier: MIT
import { buildGroups, type Message } from "@/lib/message-grouping";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { type FC } from "react";
import { DELEGATION_NOTIFICATION_TYPE } from "shared";
import { MessageGroup } from "./MessageGroup";
import { DelegationNotification, ToolApprovalCard, UserBubble } from "./SystemMessage";

interface Props {
  messages: Message[];
  onNavigate?: (id: string) => void;
  sessionId: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeAgentName?: string | null;
  activeAgentAvatarUrl?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
  serialTools?: string[];
  onOpenSubagentConsole?: (toolCallId: string, targetType?: string, targetId?: string) => void;
  settledApprovals?: Record<string, "confirm" | "deny">;
  onResolveApproval?: (toolCallId: string, action: "confirm" | "deny") => void;
}

export const MessageList: FC<Props> = ({
  messages,
  onNavigate,
  sessionId,
  activeProjectName,
  activeAgentId = null,
  activeAgentName = null,
  activeAgentAvatarUrl = null,
  activeChannelId = null,
  activeTeamId = null,
  serialTools,
  onOpenSubagentConsole,
  settledApprovals,
  onResolveApproval,
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <MessageSquare size={32} className="opacity-30" />
        <p className="text-sm font-sans">Send a message to start</p>
      </div>
    );
  }

  const groups = buildGroups(messages);

  const toolResultMap = new Map<string, Message>();
  for (const m of messages) {
    if ((m.role === "toolResult" || m.role === "tool_result") && m.toolCallId) {
      toolResultMap.set(m.toolCallId, m);
    }
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {groups.map((group, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {group.type === "user" ? (
              group.msg.details?.type === DELEGATION_NOTIFICATION_TYPE ? (
                <DelegationNotification msg={group.msg} />
              ) : (
                <UserBubble
                  msg={group.msg}
                  onNavigate={onNavigate}
                  sessionId={sessionId}
                  activeProjectName={activeProjectName}
                  activeAgentId={activeAgentId}
                  activeChannelId={activeChannelId}
                />
              )
            ) : group.type === "system" ? (
              <div className="flex justify-center my-2 w-full">
                <div className="bg-card/30 border border-input/40 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[85%] text-center font-medium shadow-xs">
                  {typeof group.msg.content === "string" ? group.msg.content : ""}
                </div>
              </div>
            ) : group.type === "tool_approval_request" ? (
              <ToolApprovalCard
                msg={group.msg}
                onResolve={onResolveApproval}
                settledAction={
                  group.msg.toolCallId && toolResultMap.has(group.msg.toolCallId)
                    ? (typeof toolResultMap.get(group.msg.toolCallId!)?.content === "string" &&
                        (toolResultMap.get(group.msg.toolCallId!)?.content as string).includes(
                          "[Permission Denied]",
                        )) ||
                      (Array.isArray(toolResultMap.get(group.msg.toolCallId!)?.content) &&
                        (toolResultMap.get(group.msg.toolCallId!)?.content as any[]).some(
                          (c) => c.text && c.text.includes("[Permission Denied]"),
                        ))
                      ? "deny"
                      : "confirm"
                    : group.msg.toolCallId
                      ? settledApprovals?.[group.msg.toolCallId]
                      : undefined
                }
              />
            ) : (
              <MessageGroup
                messages={group.messages}
                sessionId={sessionId}
                onNavigate={onNavigate}
                activeProjectName={activeProjectName}
                activeAgentId={activeAgentId}
                activeAgentName={activeAgentName}
                activeAgentAvatarUrl={activeAgentAvatarUrl}
                activeChannelId={activeChannelId}
                activeTeamId={activeTeamId}
                serialTools={serialTools}
                onOpenSubagentConsole={onOpenSubagentConsole}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
