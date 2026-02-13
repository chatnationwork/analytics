"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings2, Calendar, Info, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FunnelChart as ReFunnelChart,
  Funnel,
  Cell,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

interface FunnelStep {
  name: string;
  eventName: string;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page View",
  button_click: "Button Click",
  otp_success: "OTP Success",
  validation_success: "Validation Success",
  return_filed: "Return Filed",
  payment_initiated: "Payment Initiated",
};

function getEventLabel(eventName: string): string {
  return (
    EVENT_LABELS[eventName] ||
    eventName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const MAX_STEPS = 10;

// Colors for the funnel steps
const CHART_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];

export default function FunnelPage() {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [useJourneyFlags, setUseJourneyFlags] = useState(false);
  const [strictMode, setStrictMode] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Fetch current tenant first
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  // Fetch available events for the current tenant
  const { data: availableEvents = [] } = useQuery({
    queryKey: ["distinctEvents", tenant?.tenantId],
    queryFn: () => api.getDistinctEvents(tenant?.tenantId),
    enabled: !!tenant?.tenantId,
  });

  useEffect(() => {
    if (availableEvents.length >= 2 && steps.length === 0) {
      const defaultSteps = availableEvents
        .slice(0, Math.min(4, availableEvents.length))
        .map((eventName) => ({
          name: getEventLabel(eventName),
          eventName,
        }));
      setSteps(defaultSteps);
    }
  }, [availableEvents, steps.length]);

  const { data: funnelData, isLoading } = useQuery({
    queryKey: [
      "funnel",
      steps,
      tenant?.tenantId,
      dateRange.start,
      dateRange.end,
      useJourneyFlags,
      strictMode,
    ],
    queryFn: () =>
      api.analyzeFunnel(
        steps,
        dateRange.start,
        dateRange.end,
        tenant?.tenantId,
        useJourneyFlags,
        strictMode,
      ),
    enabled: steps.length >= 2 && !!tenant?.tenantId,
  });

  const setRangeToLast = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setDateRange({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS || availableEvents.length === 0) return;
    const unusedEvent = availableEvents.find(
      (e) => !steps.some((s) => s.eventName === e),
    );
    const eventToAdd = unusedEvent ?? availableEvents[0];
    setSteps([
      ...steps,
      { name: getEventLabel(eventToAdd), eventName: eventToAdd },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 2) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, eventName: string) => {
    const newSteps = [...steps];
    newSteps[index] = { name: getEventLabel(eventName), eventName };
    setSteps(newSteps);
  };

  // Prepare data for recharts
  const chartData = funnelData?.steps?.map((step, index) => ({
    name: step.name,
    value: step.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  })) || [];

  // Find biggest drop-off
  const biggestDropoff =
    funnelData?.steps && funnelData.steps.length > 1
      ? funnelData.steps.reduce(
          (acc, step, i) => {
            if (i === 0) return acc;
            const prev = funnelData.steps[i - 1];
            const dropoff =
              prev.count > 0
                ? ((prev.count - step.count) / prev.count) * 100
                : 0;
            if (dropoff > acc.dropoff) {
              return { dropoff, fromStep: prev.name, toStep: step.name };
            }
            return acc;
          },
          { dropoff: 0, fromStep: "", toStep: "" },
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Funnel Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize user conversion across sequential steps
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="funnel-start" className="text-xs">
                  From
                </Label>
                <Input
                  id="funnel-start"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-[140px] h-9"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="funnel-end" className="text-xs">
                  To
                </Label>
                <Input
                  id="funnel-end"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-[140px] h-9"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRangeToLast(7)}
              className="h-9"
            >
              7d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRangeToLast(30)}
              className="h-9"
            >
              30d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRangeToLast(90)}
              className="h-9"
            >
              90d
            </Button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium rounded-lg transition-colors ${
              showFilters
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Customize Steps
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Step Builder & Config */}
        <div className={`lg:col-span-4 space-y-6 ${showFilters ? "block" : "hidden lg:block lg:opacity-0 lg:pointer-events-none lg:w-0 lg:overflow-hidden transition-all"}`}>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Funnel Definition
              </h2>
              <button
                type="button"
                onClick={addStep}
                disabled={steps.length >= MAX_STEPS || availableEvents.length === 0}
                className="text-xs font-medium text-blue-500 hover:text-blue-400 disabled:opacity-50"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${strictMode ? "bg-blue-500" : "bg-muted"}`}>
                    <input
                      type="checkbox"
                      checked={strictMode}
                      onChange={(e) => setStrictMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${strictMode ? "translate-x-5" : ""}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      Strict Flow
                      <Zap className="w-3 h-3 text-yellow-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">Enforce sequential event order</p>
                  </div>
                </label>
              </div>

              {!strictMode && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer opacity-70">
                  <input
                    type="checkbox"
                    checked={useJourneyFlags}
                    onChange={(e) => setUseJourneyFlags(e.target.checked)}
                    className="rounded border-border"
                    aria-label="Use journey start/end flags"
                  />
                  Filter by journey start/end flags
                </label>
              )}
            </div>

            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/50">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 relative bg-card">
                  <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 z-10 transition-colors ${index === 0 ? "bg-blue-500 text-white" : index === steps.length - 1 ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {index + 1}
                  </span>
                  <select
                    value={step.eventName}
                    onChange={(e) => updateStep(index, e.target.value)}
                    aria-label={`Step ${index + 1} event`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
                  >
                    {availableEvents.length === 0 ? (
                      <option>Loading...</option>
                    ) : (
                      availableEvents.map((eventName) => (
                        <option key={eventName} value={eventName}>
                          {getEventLabel(eventName)}
                        </option>
                      ))
                    )}
                  </select>
                  {steps.length > 2 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <span className="text-lg">✕</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground italic">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  {strictMode 
                    ? "Strict mode counts sessions that performed the sequence in exact order." 
                    : "Loose mode counts independent unique sessions for each event."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main: Visualization */}
        <div className={`${showFilters ? "lg:col-span-8" : "lg:col-span-12"} transition-all`}>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                Conversion Pipeline
                {strictMode && <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">STRICT</span>}
              </h2>
              {funnelData?.steps?.[0] && (
                <div className="text-xs text-muted-foreground">
                  Overall Conversion: <span className="font-bold text-foreground">{funnelData.steps[funnelData.steps.length-1].percent}%</span>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 flex flex-col sm:flex-row gap-8">
              {/* Funnel Chart */}
              <div className="w-full sm:w-1/2 h-[350px]">
                {isLoading ? (
                  <div className="w-full h-full animate-pulse bg-muted rounded-lg" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReFunnelChart>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)' }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                      />
                      <Funnel
                        data={chartData}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList position="right" fill="var(--muted-foreground)" dataKey="name" stroke="none" fontWeight="500" />
                      </Funnel>
                    </ReFunnelChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                    No data to visualize
                  </div>
                )}
              </div>

              {/* Data Breakdown */}
              <div className="w-full sm:w-1/2 space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
                  </div>
                ) : funnelData?.steps?.map((step, index) => {
                  const dropoff = index > 0 && funnelData.steps[index - 1].count > 0
                      ? Math.round(((funnelData.steps[index - 1].count - step.count) / funnelData.steps[index - 1].count) * 100)
                      : 0;
                  
                  return (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-xs font-semibold text-foreground">{step.name}</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-foreground">{step.count.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">({step.percent}%)</span>
                        </div>
                      </div>
                      <div className="h-6 w-full bg-muted rounded-md relative overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                          style={{ 
                            width: `${Math.max(step.percent, 2)}%`, 
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                            opacity: 0.8
                          }}
                        />
                      </div>
                      {index < funnelData.steps.length - 1 && (
                        <div className="mt-2 flex items-center justify-center">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-[10px] text-destructive font-medium border border-destructive/10">
                            <ArrowRight className="w-2.5 h-2.5 rotate-90" />
                            {index > 0 && funnelData.steps[index].count > 0 ? (
                              <span>-{Math.round(((step.count - funnelData.steps[index+1].count)/step.count)*100)}% drop-off</span>
                            ) : index === 0 ? (
                               <span>-{Math.round(((step.count - funnelData.steps[index+1].count)/step.count)*100)}% drop-off</span>
                            ) : <span>0% drop-off</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight Overlay */}
            {biggestDropoff && biggestDropoff.dropoff > 5 && (
              <div className="px-6 py-4 bg-yellow-500/5 border-t border-yellow-500/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Growth Opportunity</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Largest friction point: <span className="font-semibold text-foreground">{Math.round(biggestDropoff.dropoff)}%</span> drop-off between <span className="font-semibold text-foreground">{biggestDropoff.fromStep}</span> and <span className="font-semibold text-foreground">{biggestDropoff.toStep}</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
