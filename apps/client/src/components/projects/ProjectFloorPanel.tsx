import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { wsClient } from "@/lib/ws-client";
import { Play, Shield, HelpCircle, Check, X, AlertTriangle, Send, Users } from "lucide-react";
import { ProjectAssignmentModal } from "./ProjectAssignmentModal";

interface ProjectFloorPanelProps {
  projectId: string | null;
}

interface Agent {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
}

interface Session {
  id: string;
  name: string;
  status?: string;
  agentId?: string;
  projectName?: string;
  lastMessage?: string;
  updatedAt?: string;
}

interface ApprovalRequest {
  id: string;
  sessionId: string;
  toolName: string;
  args: Record<string, any>;
  reason: string;
}

export function ProjectFloorPanel({ projectId }: ProjectFloorPanelProps) {
  const [project, setProject] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autonomyMap, setAutonomyMap] = useState<Record<string, "auto" | "propose" | "suggest">>({});
  const [steerMessages, setSteerMessages] = useState<Record<string, string>>({});
  const [startingAgent, setStartingAgent] = useState<string | null>(null);

  const [assignment, setAssignment] = useState<any>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setError(null);
      // Fetch project details
      const projRes = await apiFetch("/api/workspace-projects");
      if (projRes.ok) {
        const data = await projRes.json();
        const found = data.projects?.find((p: any) => p.id === projectId);
        if (found) setProject(found);
      }

      // Fetch project assignment
      const assignRes = await apiFetch(`/api/workspace-projects/${projectId}/assignment`).catch(() => null);
      if (assignRes && assignRes.ok) {
        const assignData = await assignRes.json();
        setAssignment(assignData.assignment || null);
      }

      // Fetch project agents
      const agentsRes = await apiFetch(`/api/workspace-projects/${projectId}/agents`);
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }

      // Fetch sessions filtered by project
      const sessionsRes = await apiFetch(`/api/sessions?projectId=${projectId}`);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);

        // Load autonomy level for active sessions
        for (const s of (data.sessions || [])) {
          const toolsRes = await apiFetch(`/api/sessions/${s.id}/tools`);
          if (toolsRes.ok) {
            const toolsData = await toolsRes.json();
            if (toolsData.autonomyLevel) {
              setAutonomyMap(prev => ({ ...prev, [s.id]: toolsData.autonomyLevel }));
            }
          }
        }
      }

      // Fetch pending approvals
      const approvalsRes = await apiFetch("/api/approvals");
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setApprovals(data.pending || []);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load floor data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Subscribe to WS updates
  useEffect(() => {
    const handleWsUpdate = () => {
      fetchProjectData();
    };

    const unsubProject = wsClient.subscribe("project_updated", handleWsUpdate);
    const unsubSession = wsClient.subscribe("session_updated", handleWsUpdate);
    const unsubApproval = wsClient.subscribe("approval_requested", handleWsUpdate);
    const unsubGlobal = wsClient.subscribe("global_log", handleWsUpdate);

    return () => {
      unsubProject();
      unsubSession();
      unsubApproval();
      unsubGlobal();
    };
  }, [fetchProjectData]);

  const updateProjectStatus = async (status: "planning" | "running" | "review" | "done") => {
    if (!projectId || !project) return;
    try {
      const res = await apiFetch(`/api/workspace-projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProject(updated);
        // Force refresh
        await fetchProjectData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update project status");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update project status");
    }
  };

  const handleStartAgent = async (agent: Agent) => {
    if (!projectId) return;
    try {
      setStartingAgent(agent.id);
      const res = await apiFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${agent.name} Workspace`,
          agentId: agent.id,
          projectId: projectId,
        }),
      });
      if (res.ok) {
        await fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to start agent:", err);
    } finally {
      setStartingAgent(null);
    }
  };

  const changeAutonomyLevel = async (sessionId: string, level: "auto" | "propose" | "suggest") => {
    try {
      // Get current tools first to avoid resetting them
      const toolsRes = await apiFetch(`/api/sessions/${sessionId}/tools`);
      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        const res = await apiFetch(`/api/sessions/${sessionId}/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tools: toolsData.tools || [],
            executionMode: toolsData.executionMode || "standard",
            autonomyLevel: level,
          }),
        });
        if (res.ok) {
          setAutonomyMap(prev => ({ ...prev, [sessionId]: level }));
        }
      }
    } catch (err) {
      console.error("Failed to change autonomy level:", err);
    }
  };

  const handleResolveApproval = async (approvalId: string, action: "approve" | "deny") => {
    try {
      const res = await apiFetch(`/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to resolve approval:", err);
    }
  };

  const handleSendSteerMessage = async (sessionId: string) => {
    const msg = steerMessages[sessionId]?.trim();
    if (!msg) return;

    try {
      const res = await apiFetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        setSteerMessages(prev => ({ ...prev, [sessionId]: "" }));
        await fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to send steer message:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-destructive text-sm font-semibold">
        {error}
      </div>
    );
  }

  const statuses = ["planning", "running", "review", "done"] as const;
  const currentStatus = project?.status || "planning";

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative font-sans">
      {/* Top Project Dashboard Header */}
      <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-foreground Outfit tracking-wide">Piso de Trabajo (Live floor)</h1>
            <p className="text-[11px] text-muted-foreground">Monitoreá y controlá a tus agentes en tiempo real</p>
          </div>

          {/* Project Status machine UI */}
          <div className="flex items-center gap-1.5 bg-surface/50 border border-input/20 rounded-xl p-1">
            {statuses.map(s => {
              const active = currentStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => updateProjectStatus(s)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Team Assignment Bar / Button */}
        {projectId && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAssignmentModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-card/60 hover:bg-card border border-input/40 hover:border-primary/40 rounded-xl text-xs font-semibold text-foreground transition-all cursor-pointer shadow-sm relative group"
              title="Configurar equipo asignado al proyecto"
            >
              <Users className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span>Equipo</span>
              {assignment?.leaderId && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Líder asignado activo" />
              )}
              {Array.isArray(assignment?.members) && assignment.members.length > 0 && (
                <span className="px-1.5 py-0.5 bg-primary/20 text-primary font-bold text-[10px] rounded-full">
                  {assignment.members.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Agents grid floor */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface/10">
        {agents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 pt-20">
            <p className="font-semibold text-foreground">No hay agentes asignados a este proyecto</p>
            <p className="text-xs text-muted-foreground">Asigná agentes desde la configuración del proyecto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => {
              const session = sessions.find(s => s.agentId === agent.id);
              const isRunning = session && (session.status === "active" || session.status === "streaming" || session.status === "task-running");
              const autonomy = session ? autonomyMap[session.id] || "auto" : "auto";
              const pendingApproval = session ? approvals.find(app => app.sessionId === session.id) : null;

              return (
                <div
                  key={agent.id}
                  className={`bg-card/40 border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl duration-300 relative ${
                    isRunning ? "border-emerald-500/20 shadow-emerald-500/5" : "border-border/40"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-input/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-hover relative border border-input/10">
                        <EntityAvatar name={agent.name} avatarUrl={agent.avatarUrl} size="full" type="agent" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-foreground leading-tight flex items-center gap-1.5">
                          {agent.name}
                          {isRunning && (
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                          {agent.role || "Especialista"}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider">
                      {session ? (
                        <span
                          className={
                            session.status === "streaming" || session.status === "task-running"
                              ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                              : pendingApproval
                              ? "text-amber-400 bg-amber-500/5 border-amber-500/10"
                              : "text-neutral-400 bg-neutral-500/5 border-neutral-500/10"
                          }
                        >
                          {pendingApproval ? "WAITING APPROVAL" : session.status || "idle"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground bg-muted/5 border-muted/10">OFFLINE</span>
                      )}
                    </div>
                  </div>

                  {/* Card Content / Logs / Action panel */}
                  <div className="flex-1 py-4 flex flex-col justify-between min-h-[140px]">
                    {session ? (
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Autonomy Level Control */}
                        <div className="mb-3.5">
                          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block mb-1">
                            Nivel de Autonomía
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-surface-hover/80 rounded-xl p-0.5 border border-input/5">
                            {(["auto", "propose", "suggest"] as const).map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => changeAutonomyLevel(session.id, lvl)}
                                className={`py-1 text-[9px] font-bold rounded-lg transition-all capitalize cursor-pointer flex items-center justify-center gap-1 ${
                                  autonomy === lvl
                                    ? "bg-bg text-foreground shadow border border-input/10"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {lvl === "auto" && <Shield size={10} />}
                                {lvl === "propose" && <HelpCircle size={10} />}
                                {lvl === "suggest" && <AlertTriangle size={10} />}
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Approvals Gate Inside Card */}
                        {pendingApproval ? (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl mb-3 flex flex-col gap-2 animate-pulse-slow">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                              <AlertTriangle size={12} />
                              Aprobación Requerida
                            </div>
                            <p className="text-[11px] text-foreground leading-normal font-medium bg-black/20 p-2 rounded-lg font-mono truncate">
                              Tool: {pendingApproval.toolName}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                              Razón: {pendingApproval.reason}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold py-1 h-7 cursor-pointer"
                                onClick={() => handleResolveApproval(pendingApproval.id, "approve")}
                              >
                                <Check size={12} className="mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-[10px] font-bold py-1 h-7 cursor-pointer"
                                onClick={() => handleResolveApproval(pendingApproval.id, "deny")}
                              >
                                <X size={12} className="mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Agent Live Activity Log console */
                          <div className="flex-1 bg-black/25 rounded-xl p-3 border border-input/5 font-mono text-[10px] leading-relaxed text-neutral-300 max-h-[110px] overflow-y-auto mb-3">
                            <span className="text-neutral-500 select-none">&gt;</span>{" "}
                            {session.status === "streaming" || session.status === "task-running" ? (
                              <span className="text-emerald-400 animate-pulse">Ejecutando proceso...</span>
                            ) : (
                              <span className="text-neutral-400">Agente listo en espera de instrucciones.</span>
                            )}
                          </div>
                        )}

                        {/* Live Direct Steer Message Box */}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Enviar instrucción (Steer message)..."
                            value={steerMessages[session.id] || ""}
                            onChange={e =>
                              setSteerMessages(prev => ({ ...prev, [session.id]: e.target.value }))
                            }
                            onKeyDown={e => {
                              if (e.key === "Enter") handleSendSteerMessage(session.id);
                            }}
                            className="flex-1 bg-black/10 border border-input/10 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:border-primary/50 text-foreground"
                          />
                          <button
                            onClick={() => handleSendSteerMessage(session.id)}
                            className="p-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all cursor-pointer"
                            title="Steer agent"
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <p className="text-xs text-muted-foreground mb-4">El agente no se encuentra activo.</p>
                        <Button
                          onClick={() => handleStartAgent(agent)}
                          disabled={startingAgent === agent.id}
                          className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <Play size={12} />
                          {startingAgent === agent.id ? "Iniciando..." : "Iniciar Agente"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAssignmentModal && projectId && (
        <ProjectAssignmentModal
          projectId={projectId}
          projectName={project?.name}
          onClose={() => {
            setShowAssignmentModal(false);
            fetchProjectData();
          }}
        />
      )}
    </div>
  );
}
