// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { literals as u } from "@/pages/AgentsPage.literals";
import { motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ExecutionsModal({
  agent,
  onClose,
}: {
  agent: { id: string; name: string };
  onClose: () => void;
}) {
  const l = useLiterals(u);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExec, setSelectedExec] = useState<any | null>(null);
  const [execDetail, setExecDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchExecs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await agentsService.fetchAgentExecutions(agent.id);
        setExecutions((data as any).executions || data || []);
      } catch (err: any) {
        setError(err.message || l.loadExecError);
      } finally {
        setLoading(false);
      }
    };
    fetchExecs();
  }, [agent.id, l.loadExecError]);

  const loadDetail = async (execId: string) => {
    setLoadingDetail(true);
    try {
      const data = await agentsService.fetchAgentExecutionDetail(agent.id, execId);
      setExecDetail(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectExec = (exec: any) => {
    setSelectedExec(exec);
    setExecDetail(null);
    loadDetail(exec.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-4xl h-[80vh] bg-card border border-input rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-input flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {l.execTitle}: {agent.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{l.execSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Execution List */}
          <div className="w-1/3 border-r border-input overflow-y-auto p-3 flex flex-col gap-2 bg-background/50 flex-shrink-0">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && error && <p className="text-xs text-destructive p-3">{error}</p>}
            {!loading && !error && executions.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">{l.noExecutions}</p>
            )}
            {!loading &&
              !error &&
              executions.map((exec) => (
                <button
                  key={exec.id}
                  onClick={() => handleSelectExec(exec)}
                  className={`text-left p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                    selectedExec?.id === exec.id
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-card border-input text-muted-foreground hover:border-input/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono text-xs text-muted-foreground">
                      {exec.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(exec.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium text-foreground truncate w-full mt-0.5">
                    {exec.prompt}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    <span>{(exec.durationMs / 1000).toFixed(1)}s</span>
                    {exec.errors && exec.errors.length > 0 && (
                      <span className="text-destructive font-medium">
                        ⚠️ {exec.errors.length} {l.errors}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>

          {/* Details Pane */}
          <div className="flex-1 overflow-y-auto p-5 bg-card flex flex-col gap-4">
            {!selectedExec && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Info size={24} className="mb-2" />
                <p className="text-xs">{l.selectExecHint}</p>
              </div>
            )}

            {selectedExec && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {l.prompt}
                  </h3>
                  <p className="text-sm font-medium text-foreground bg-background p-3 rounded-lg border border-input mt-1.5 leading-relaxed">
                    {selectedExec.prompt}
                  </p>
                </div>

                {loadingDetail && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loadingDetail && execDetail && (
                  <>
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/50 border border-input rounded-xl p-3 flex flex-col">
                        <span className="text-xs text-muted-foreground">{l.execDuration}</span>
                        <span className="text-sm font-semibold text-foreground mt-0.5">
                          {(execDetail.durationMs / 1000).toFixed(2)}
                          {l.seconds}
                        </span>
                      </div>
                      <div className="bg-background/50 border border-input rounded-xl p-3 flex flex-col">
                        <span className="text-xs text-muted-foreground">{l.execStatus}</span>
                        <span
                          className={`text-sm font-semibold mt-0.5 ${execDetail.errors?.length > 0 ? "text-destructive" : "text-primary"}`}
                        >
                          {execDetail.errors?.length > 0
                            ? `${execDetail.errors.length} ${l.errors}`
                            : l.success}
                        </span>
                      </div>
                    </div>

                    {/* Errors if any */}
                    {execDetail.errors && execDetail.errors.length > 0 && (
                      <div className="border border-error/20 bg-destructive/5 rounded-xl p-4 flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                          ⚠️ {l.errorsFound}
                        </h4>
                        <ul className="list-disc pl-4 text-xs text-destructive/90 space-y-1.5 font-mono">
                          {execDetail.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tool Calls */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {l.executedTools}
                      </h4>
                      {!execDetail.toolCalls || execDetail.toolCalls.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">{l.noTools}</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {execDetail.toolCalls.map((tc: any, i: number) => (
                            <details
                              key={i}
                              className="border border-input rounded-xl bg-background/30 overflow-hidden text-xs"
                            >
                              <summary className="p-3 font-mono font-medium hover:bg-card-hover cursor-pointer flex justify-between items-center select-none text-foreground">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={tc.isError ? "text-destructive" : "text-primary"}
                                  >
                                    ●
                                  </span>
                                  <span>{tc.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-sans">
                                  {tc.endedAt
                                    ? `${((new Date(tc.endedAt).getTime() - new Date(tc.startedAt).getTime()) / 1000).toFixed(2)}s`
                                    : l.running}
                                </span>
                              </summary>
                              <div className="p-4 border-t border-input bg-background/50 flex flex-col gap-3 font-mono">
                                <div>
                                  <span className="text-xs text-muted-foreground uppercase block mb-1">
                                    {l.arguments}
                                  </span>
                                  <pre className="text-xs bg-background p-2.5 rounded-lg overflow-x-auto text-foreground max-h-40">
                                    {JSON.stringify(tc.args, null, 2)}
                                  </pre>
                                </div>
                                {tc.result && (
                                  <div>
                                    <span className="text-xs text-muted-foreground uppercase block mb-1">
                                      {l.result}
                                    </span>
                                    <pre className="text-xs bg-background p-2.5 rounded-lg overflow-x-auto text-foreground max-h-60 whitespace-pre-wrap">
                                      {typeof tc.result === "string"
                                        ? tc.result
                                        : JSON.stringify(tc.result, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Logs */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {l.sessionMessages}
                      </h4>
                      <div className="flex flex-col gap-2 border border-input rounded-xl p-3 bg-background/20">
                        {execDetail.messages
                          ?.filter((m: any) => m.role !== "system")
                          .map((m: any, i: number) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded-lg text-xs leading-relaxed ${m.role === "user" ? "bg-primary/5 ml-8 border border-primary/10" : "bg-card-hover mr-8 border border-input"}`}
                            >
                              <div className="font-semibold text-foreground mb-1 uppercase tracking-wider text-xs text-muted-foreground">
                                {m.role}
                              </div>
                              <div className="whitespace-pre-wrap text-foreground font-mono text-[11px] leading-normal bg-background/30 p-1.5 rounded border border-input/30 mt-1">
                                {typeof m.content === "string"
                                  ? m.content
                                  : JSON.stringify(m.content)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
