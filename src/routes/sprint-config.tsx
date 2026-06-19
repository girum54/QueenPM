import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Sparkles, Calendar, Clock, CheckCircle2, AlertCircle, Plus, Trash2,
  Workflow, ChevronRight, BarChart3, Users, Play, Check, Loader2
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/queen-store";

import { sprintsApi } from "@/lib/api/queen.api";
import { useEffect } from "react";
import { DatePicker } from "@/components/DatePicker";
import { formatDisplayDate, getSprintEndDate } from "@/lib/sprint-dates";

export const Route = createFileRoute("/sprint-config")({
  head: () => ({
    meta: [
      { title: "Sprint Config — Queen PM" },
      { name: "description", content: "Configure project sprints and track execution metrics." },
    ],
  }),
  component: SprintConfigPage,
});

interface Sprint {
  id: string;
  name: string;
  style: string;          // free-text — user defines their own methodology label
  durationWeeks: number;
  startDate: string;
  goal: string;
  deliverables: { id: string; text: string; done: boolean }[];
  isActive: boolean;
}

export function SprintConfigPage() {
  const { tasks, activeProjectId } = useStore();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup Form State
  const [formName, setFormName] = useState("");
  const [formStyle, setFormStyle] = useState("");  // free-text methodology label
  const [formDuration, setFormDuration] = useState(2);
  const [formStartDate, setFormStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [formGoal, setFormGoal] = useState("");
  const [formDeliverables, setFormDeliverables] = useState<string[]>([]);
  const [newDeliverableText, setNewDeliverableText] = useState("");

  const computedSprintEnd = getSprintEndDate(formStartDate, formDuration);

  useEffect(() => {
    if (!activeProjectId) return;
    async function fetchActiveSprint() {
      try {
        setLoading(true);
        const activeSprint = await sprintsApi.getActive(activeProjectId);
        if (activeSprint) {
          const deliverables = await sprintsApi.getDeliverables(activeSprint.id);
          setSprint({
            id: activeSprint.id,
            name: activeSprint.name,
            style: activeSprint.style || "",
            durationWeeks: activeSprint.durationWeeks,
            startDate: activeSprint.startDate,
            goal: activeSprint.goal || "",
            deliverables: deliverables.map(d => ({ id: d.id, text: d.text, done: d.done })),
            isActive: activeSprint.isActive
          });
        } else {
          setSprint(null);
        }
      } catch (e) {
        console.error("Failed to load active sprint:", e);
        setSprint(null);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveSprint();
  }, [activeProjectId]);

  const handleAddDeliverable = () => {
    if (newDeliverableText.trim()) {
      setFormDeliverables([...formDeliverables, newDeliverableText.trim()]);
      setNewDeliverableText("");
    }
  };

  const handleRemoveDeliverable = (index: number) => {
    setFormDeliverables(formDeliverables.filter((_, i) => i !== index));
  };

  const handleStartSprint = async () => {
    if (!activeProjectId) return;
    setIsSubmitting(true);
    try {
      // 1. Create Sprint
      const created = await sprintsApi.create({
        projectId: activeProjectId,
        name: formName || "Unnamed Sprint",
        style: formStyle,
        durationWeeks: formDuration,
        startDate: formStartDate,
        goal: formGoal,
      });

      // 2. Add deliverables
      const dbDels = await sprintsApi.replaceDeliverables(created.id, formDeliverables);

      // 3. Activate Sprint
      const activated = await sprintsApi.activate(created.id);

      setSprint({
        id: activated.id,
        name: activated.name,
        style: activated.style || "",
        durationWeeks: activated.durationWeeks,
        startDate: activated.startDate,
        goal: activated.goal || "",
        deliverables: dbDels.map(d => ({ id: d.id, text: d.text, done: d.done })),
        isActive: activated.isActive
      });
    } catch (e) {
      console.error("Failed to start sprint:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeliverable = async (id: string) => {
    if (!sprint) return;
    const item = sprint.deliverables.find(d => d.id === id);
    if (!item) return;
    try {
      const updatedDel = await sprintsApi.updateDeliverable(sprint.id, id, {
        done: !item.done
      });
      setSprint({
        ...sprint,
        deliverables: sprint.deliverables.map(d => d.id === id ? { ...d, done: updatedDel.done } : d)
      });
    } catch (e) {
      console.error("Failed to toggle deliverable:", e);
    }
  };

  const handleCompleteSprint = async () => {
    if (!sprint) return;
    try {
      await sprintsApi.complete(sprint.id);
      setSprint(null);
    } catch (e) {
      console.error("Failed to complete sprint:", e);
    }
  };

  // Metrics calculations for Active Sprint
  const activeSprintMetrics = useMemo(() => {
    if (!sprint) return null;
    const totalDeliverables = sprint.deliverables.length;
    const completedDeliverables = sprint.deliverables.filter(d => d.done).length;
    const deliverablesProgressPct = totalDeliverables === 0 ? 0 : Math.round((completedDeliverables / totalDeliverables) * 100);

    // Filter tasks belonging to active sprint (simulated as active/staging/deployed)
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.column === "deployed").length;
    const inProgressTasks = tasks.filter(t => t.column === "active" || t.column === "staging").length;
    const taskProgressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Calculate days remaining
    const start = new Date(sprint.startDate).getTime();
    const end = start + sprint.durationWeeks * 7 * 24 * 60 * 60 * 1000;
    const remainingMs = end - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    return {
      totalDeliverables,
      completedDeliverables,
      deliverablesProgressPct,
      totalTasks,
      completedTasks,
      inProgressTasks,
      taskProgressPct,
      daysRemaining
    };
  }, [sprint, tasks]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center bg-slate-950">
          <div className="text-slate-400 text-sm animate-pulse">Retrieving sprint specification...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6">
          
          {/* Breadcrumbs & Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Sparkles className="size-3.5 text-fuchsia-400" /> Sprint Management
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
                {sprint ? sprint.name : "Configure New Sprint"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {sprint 
                  ? `Running a ${sprint.style.toUpperCase()} sprint for ${sprint.durationWeeks} weeks` 
                  : "Initialize your deliverables, sprint duration, and delivery methodologies."}
              </p>
            </div>

            {sprint && (
              <button
                onClick={handleCompleteSprint}
                className="h-9 px-4 rounded-md bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 transition"
              >
                Complete Sprint
              </button>
            )}
          </div>

          {!sprint ? (
            /* CONFIGURATION FORM */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Core Setup */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Basic Details */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Workflow className="size-4 text-fuchsia-400" /> Core Specifications
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sprint Identifier</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Sprint Q3 - Payments"
                        className="w-full h-10 rounded-md bg-slate-950/60 border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 px-3 text-sm text-slate-100 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sprint Goal & Context</label>
                      <textarea
                        value={formGoal}
                        onChange={(e) => setFormGoal(e.target.value)}
                        placeholder="Describe the main focus of this sprint..."
                        rows={3}
                        className="w-full rounded-md bg-slate-950/60 border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 p-3 text-sm text-slate-100 outline-none resize-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Management Style */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Workflow className="size-4 text-fuchsia-400" /> Delivery Methodology
                  </h3>
                  <p className="text-xs text-slate-500">
                    Name your methodology however you like — Scrum, Kanban, Weekly Pulse, Chaos Mode, anything.
                  </p>
                  <input
                    type="text"
                    value={formStyle}
                    onChange={(e) => setFormStyle(e.target.value)}
                    placeholder="e.g. Agile Scrum, Weekly Pulse, Chaos Mode…"
                    className="w-full h-10 rounded-md bg-slate-950/60 border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 px-3 text-sm text-slate-100 outline-none transition"
                  />
                </div>

                {/* Timeline & Parameters */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Calendar className="size-4 text-fuchsia-400" /> Timeline Parameters
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sprint Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setFormDuration(w)}
                            className={`h-9 rounded-md text-xs font-semibold transition ${
                              formDuration === w
                                ? "bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-500/40"
                                : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {w} {w === 1 ? "Week" : "Weeks"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Commencement Date</label>
                      <DatePicker
                        value={formStartDate}
                        onChange={setFormStartDate}
                        placeholder="Sprint start date"
                        className="bg-slate-950/60 border-slate-800"
                      />
                      {computedSprintEnd && (
                        <p className="text-[10px] text-slate-500 mt-1.5">
                          Sprint ends <span className="text-slate-300 font-medium">{formatDisplayDate(computedSprintEnd)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Deliverables Panel */}
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col h-[482px]">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="size-4 text-fuchsia-400" /> Target Deliverables
                  </h3>
                  
                  {/* List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
                    {formDeliverables.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                        <AlertCircle className="size-5 mb-2 text-slate-600" />
                        No deliverables specified yet. Add at least one to scope this sprint.
                      </div>
                    ) : (
                      formDeliverables.map((d, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg text-xs group"
                        >
                          <div className="size-1.5 rounded-full bg-fuchsia-500 shrink-0" />
                          <span className="text-slate-300 flex-1 truncate">{d}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDeliverable(index)}
                            className="size-5 opacity-0 group-hover:opacity-100 grid place-items-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input Form */}
                  <div className="mt-auto space-y-2 pt-3 border-t border-slate-850">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDeliverableText}
                        onChange={(e) => setNewDeliverableText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDeliverable()}
                        placeholder="Add deliverable..."
                        className="flex-1 h-9 rounded-md bg-slate-950/60 border border-slate-800 px-3 text-xs text-slate-100 outline-none focus:border-fuchsia-500 transition"
                      />
                      <button
                        type="button"
                        onClick={handleAddDeliverable}
                        className="size-9 rounded-md bg-slate-800 hover:bg-slate-700 grid place-items-center text-slate-300 shrink-0 transition"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartSprint}
                      disabled={formDeliverables.length === 0 || isSubmitting}
                      className="w-full h-10 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-medium text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-fuchsia-500/20 mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5 fill-current" /> Initialize Active Sprint
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* ACTIVE SPRINT DASHBOARD */
            <div className="space-y-6">
              
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-fuchsia-500/10 ring-fuchsia-500/30">
                    <Clock className="size-4 text-fuchsia-300" />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Time Remaining</div>
                  <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">
                    {activeSprintMetrics?.daysRemaining}d
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">out of {sprint.durationWeeks * 7} total days</div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-sky-500/10 ring-sky-500/30">
                    <CheckCircle2 className="size-4 text-sky-300" />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Deliverables</div>
                  <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">
                    {activeSprintMetrics?.completedDeliverables}/{activeSprintMetrics?.totalDeliverables}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {activeSprintMetrics?.deliverablesProgressPct}% checklist execution
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-violet-500/10 ring-violet-500/30">
                    <BarChart3 className="size-4 text-violet-300" />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Task Execution</div>
                  <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">
                    {activeSprintMetrics?.completedTasks}/{activeSprintMetrics?.totalTasks}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {activeSprintMetrics?.inProgressTasks} tasks currently in-flight
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-emerald-500/10 ring-emerald-500/30">
                    <Users className="size-4 text-emerald-300" />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Sprint Health</div>
                  <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">
                    {activeSprintMetrics && activeSprintMetrics.daysRemaining > 0
                      ? activeSprintMetrics.taskProgressPct > 50 
                        ? "Optimal" 
                        : "On Track"
                      : "Complete"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{activeSprintMetrics?.taskProgressPct}% task completion rate</div>
                </div>

              </div>

              {/* Goal & Details Panel */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">Sprint Objective</h3>
                  <p className="text-base text-slate-200 mt-1.5 leading-relaxed font-sans">{sprint.goal}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Overall Delivery Progress</span>
                    <span className="font-semibold text-fuchsia-400">{activeSprintMetrics?.deliverablesProgressPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${activeSprintMetrics?.deliverablesProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Two Column details: Deliverables vs Sprint Velocity/Scope */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Deliverables Checklist */}
                <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-fuchsia-400" /> Active Deliverables Checklist
                  </h3>

                  <div className="space-y-3">
                    {sprint.deliverables.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleToggleDeliverable(d.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition group ${
                          d.done
                            ? "bg-slate-950/60 border-slate-800/50 text-slate-500"
                            : "bg-slate-950/20 border-slate-850 text-slate-200 hover:border-slate-750 hover:bg-slate-950/30"
                        }`}
                      >
                        <div className={`size-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          d.done 
                            ? "border-fuchsia-500 bg-fuchsia-500 text-white" 
                            : "border-slate-700 group-hover:border-slate-500 text-transparent"
                        }`}>
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                        <span className={`text-xs font-medium flex-1 ${d.done ? "line-through" : ""}`}>{d.text}</span>
                        <ChevronRight className="size-4 text-slate-600 group-hover:text-slate-400 transition" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope & Velocity Visual */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <BarChart3 className="size-4 text-fuchsia-400" /> Sprint Burndown (Projected)
                  </h3>

                  {/* SVG Burndown visualization */}
                  <div className="relative h-44 border border-slate-800/60 rounded-lg bg-slate-950/40 p-3 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                      <div className="w-full h-full bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                    </div>

                    {/* Chart lines */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Ideal line (gray dashed) */}
                      <line x1="0" y1="10" x2="100" y2="90" stroke="#475569" strokeWidth="1" strokeDasharray="3" />
                      {/* Actual line (fuchsia gradient) */}
                      <path
                        d={`M 0,10 L 25,18 L 50,45 L 75,${100 - (activeSprintMetrics?.deliverablesProgressPct ?? 0) * 0.8} L 100,${90 - (activeSprintMetrics?.deliverablesProgressPct ?? 0) * 0.8}`}
                        fill="none"
                        stroke="url(#fuchsia-glow)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="fuchsia-glow" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 pt-1.5 border-t border-slate-900/80">
                      <span>Day 1</span>
                      <span>Halfway</span>
                      <span>Day {sprint.durationWeeks * 7}</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Methodology</span>
                      <span className="font-semibold text-slate-200">{sprint.style || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total Work Scope</span>
                      <span className="font-semibold text-slate-200">{activeSprintMetrics?.totalTasks} tasks in-system</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Commitment Delivery</span>
                      <span className="font-semibold text-fuchsia-400">{activeSprintMetrics?.completedTasks} tasks deployed</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
