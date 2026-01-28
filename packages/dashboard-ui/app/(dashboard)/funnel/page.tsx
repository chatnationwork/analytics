"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings2 } from "lucide-react";

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

export default function FunnelPage() {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
    queryKey: ["funnel", steps, tenant?.tenantId],
    queryFn: () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return api.analyzeFunnel(
        steps,
        thirtyDaysAgo.toISOString(),
        now.toISOString(),
        tenant?.tenantId,
      );
    },
    enabled: steps.length >= 2 && !!tenant?.tenantId,
  });

  const addStep = () => {
    const unusedEvent = availableEvents.find(
      (e) => !steps.some((s) => s.eventName === e),
    );
    if (unusedEvent) {
      setSteps([
        ...steps,
        { name: getEventLabel(unusedEvent), eventName: unusedEvent },
      ]);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Funnels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            showFilters
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Customize
        </button>
      </div>

      {/* Step Builder */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">
              Funnel Steps
            </h2>
            <button
              onClick={addStep}
              disabled={steps.length >= availableEvents.length}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              + Add Step
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <select
                  value={step.eventName}
                  onChange={(e) => updateStep(index, e.target.value)}
                  aria-label={`Step ${index + 1} event`}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableEvents.map((eventName) => (
                    <option key={eventName} value={eventName}>
                      {getEventLabel(eventName)}
                    </option>
                  ))}
                </select>
                {steps.length > 2 && (
                  <button
                    onClick={() => removeStep(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-8 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {funnelData && funnelData.steps && funnelData.steps.length > 0 && (
          <div className="space-y-4">
            {funnelData.steps.map((step, index) => {
              const maxCount = funnelData.steps[0]?.count || 1;
              const widthPercent =
                maxCount > 0 ? (step.count / maxCount) * 100 : 0;
              const dropoff =
                index > 0 && funnelData.steps[index - 1].count > 0
                  ? Math.round(
                      ((funnelData.steps[index - 1].count - step.count) /
                        funnelData.steps[index - 1].count) *
                        100,
                    )
                  : 0;

              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground font-medium">
                      {step.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {step.count.toLocaleString()}
                      </span>
                      <span className="text-foreground font-semibold">
                        {step.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg transition-all duration-700"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                    {index > 0 && dropoff > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        -{dropoff}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading &&
          (!funnelData ||
            !funnelData.steps ||
            funnelData.steps.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No events tracked yet. Start sending events to see your funnel.
            </p>
          )}
      </div>

      {/* Insight */}
      {biggestDropoff && biggestDropoff.dropoff > 5 && (
        <div className="bg-yellow-500/10 rounded-xl border border-yellow-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-400 mt-0.5">💡</div>
            <div>
              <div className="font-medium text-yellow-500">
                Biggest Drop-off
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {Math.round(biggestDropoff.dropoff)}% of users drop off between{" "}
                <strong>{biggestDropoff.fromStep}</strong> and{" "}
                <strong>{biggestDropoff.toStep}</strong>. Consider optimizing
                this step.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
