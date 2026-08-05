// SPDX-License-Identifier: MIT
import { getToolCallLogs } from "../stores/audit-log";

export interface ToolMetric {
  toolName: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  blockedCount: number;
  avgDurationMs: number;
  errorRate: number;
}

export interface ObservabilityMetrics {
  totalToolCalls: number;
  activeSessionsEstimate: number;
  toolMetrics: ToolMetric[];
  mostFrequentTools: Array<{ toolName: string; count: number }>;
  slowestTools: Array<{ toolName: string; avgDurationMs: number }>;
}

export class ObservabilityService {
  getMetrics(username: string): ObservabilityMetrics {
    const logs = getToolCallLogs(username, 1000);
    const totalToolCalls = logs.length;

    const toolStats = new Map<
      string,
      { total: number; success: number; error: number; blocked: number; totalDuration: number }
    >();

    const sessionSet = new Set<string>();

    for (const log of logs) {
      if (log.sessionId) sessionSet.add(log.sessionId);
      const name = log.toolName;
      let stat = toolStats.get(name);
      if (!stat) {
        stat = { total: 0, success: 0, error: 0, blocked: 0, totalDuration: 0 };
        toolStats.set(name, stat);
      }

      stat.total++;
      stat.totalDuration += log.durationMs || 0;
      if (log.status === "error") stat.error++;
      else if (log.status === "blocked") stat.blocked++;
      else stat.success++;
    }

    const toolMetrics: ToolMetric[] = [];
    for (const [name, stat] of toolStats.entries()) {
      toolMetrics.push({
        toolName: name,
        totalCalls: stat.total,
        successCount: stat.success,
        errorCount: stat.error,
        blockedCount: stat.blocked,
        avgDurationMs: stat.total > 0 ? Math.round(stat.totalDuration / stat.total) : 0,
        errorRate:
          stat.total > 0 ? Number(((stat.error + stat.blocked) / stat.total).toFixed(3)) : 0,
      });
    }

    const mostFrequentTools = [...toolMetrics]
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 5)
      .map((t) => ({ toolName: t.toolName, count: t.totalCalls }));

    const slowestTools = [...toolMetrics]
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, 5)
      .map((t) => ({ toolName: t.toolName, avgDurationMs: t.avgDurationMs }));

    return {
      totalToolCalls,
      activeSessionsEstimate: sessionSet.size,
      toolMetrics,
      mostFrequentTools,
      slowestTools,
    };
  }
}

export const observabilityService = new ObservabilityService();
