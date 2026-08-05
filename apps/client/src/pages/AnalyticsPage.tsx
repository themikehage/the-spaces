// SPDX-License-Identifier: MIT
import { Dropdown } from "@/components/ui/Dropdown";
import { useAnalyticsState } from "@/hooks/useAnalyticsState";
import { AlertCircle, Calendar, RefreshCw } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#4ade80", "#3b82f6", "#a855f7", "#fbbf24", "#f43f5e", "#06b6d4"];

export function AnalyticsPage() {
  const state = useAnalyticsState();

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground tracking-tight">{state.l.title}</h1>
          <p className="text-xs text-muted-foreground">{state.l.subtitle}</p>
        </div>
        <button
          onClick={() => state.loadAnalytics(true)}
          disabled={state.loading || state.refreshing}
          className="p-2 hover:bg-card-hover rounded-xl border border-input text-muted-foreground hover:text-foreground disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.refreshing ? "animate-spin" : ""}`} />
          {state.refreshing ? "..." : ""}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-card/40 border border-input rounded-xl items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {state.l.filterFrom}
          </label>
          <input
            type="date"
            value={state.from}
            onChange={(e) => state.setFrom(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {state.l.filterTo}
          </label>
          <input
            type="date"
            value={state.to}
            onChange={(e) => state.setTo(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">
            {state.l.filterProject}
          </label>
          <Dropdown<string>
            value={state.selectedProject}
            onChange={state.setSelectedProject}
            options={[
              { value: "", label: state.l.allProjects },
              ...state.projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            size="sm"
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">
            {state.l.filterAgent}
          </label>
          <Dropdown<string>
            value={state.selectedAgent}
            onChange={state.setSelectedAgent}
            options={[
              { value: "", label: state.l.allAgents },
              ...state.agents.map((a) => ({ value: a.id, label: a.name })),
            ]}
            size="sm"
            className="w-full"
          />
        </div>

        <div className="col-span-2 md:col-span-1 space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">
            {state.l.filterChannel}
          </label>
          <Dropdown<string>
            value={state.selectedTeam}
            onChange={state.setSelectedTeam}
            options={[
              { value: "", label: state.l.allChannels },
              ...state.teams.map((t) => ({ value: t.id, label: `${t.name}` })),
            ]}
            size="sm"
            className="w-full"
          />
        </div>
      </div>

      {state.loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">{state.l.loading}</span>
        </div>
      ) : !state.data || state.data.totalSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-input rounded-2xl p-12 text-center text-muted-foreground space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-xs font-semibold text-foreground">{state.l.noData}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {state.kpis.map((kpi) => (
              <div
                key={kpi.id}
                className={`border rounded-2xl p-4 flex flex-col space-y-2 transition-all hover:scale-101 shadow-sm ${kpi.bg}`}
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {kpi.label}
                  </span>
                  {kpi.icon}
                </div>
                <span className="text-xl font-bold text-foreground leading-none">{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* Activity Over Time Chart */}
          <div className="bg-card border border-input rounded-2xl p-4 md:p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              {state.l.chartActivityTitle}
            </h2>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={state.data.sessionsByDay}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#737373" fontSize={10} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#4ade80"
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171717",
                      borderColor: "#262626",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#e5e5e5",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    fill="#3b82f6"
                    name="Sessions"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTokens)"
                    name="Tokens"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Tools Bar Chart */}
            <div className="bg-card border border-input rounded-2xl p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                {state.l.chartToolsTitle}
              </h2>
              <div className="h-64">
                {state.data.topTools.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                    No tools recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={state.data.topTools.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#737373" fontSize={9} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="tool"
                        stroke="#737373"
                        fontSize={9}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171717",
                          borderColor: "#262626",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#a855f7"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={15}
                        name="Executions"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Model Distribution Pie Chart */}
            <div className="bg-card border border-input rounded-2xl p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                {state.l.chartModelsTitle}
              </h2>
              <div className="h-64">
                {state.data.topModels.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                    No models recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={state.data.topModels}
                        dataKey="count"
                        nameKey="model"
                        cx="50%"
                        cy="46%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {state.data.topModels.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171717",
                          borderColor: "#262626",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "10px", lineHeight: "16px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Errors Bar Chart */}
            <div className="bg-card border border-input rounded-2xl p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                {state.l.chartErrorsTitle}
              </h2>
              <div className="h-64">
                {state.data.topErrors.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                    No errors recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.data.topErrors.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="tool" stroke="#737373" fontSize={9} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171717",
                          borderColor: "#262626",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={20}
                        name="Errors"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
