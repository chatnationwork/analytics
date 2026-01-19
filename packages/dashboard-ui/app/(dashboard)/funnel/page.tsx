'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FunnelStep {
  name: string;
  eventName: string;
}

// Friendly names for common events
const EVENT_LABELS: Record<string, string> = {
  page_view: 'Page View',
  button_click: 'Button Click',
  otp_success: 'OTP Success',
  validation_success: 'Validation Success',
  return_filed: 'Return Filed',
  payment_initiated: 'Payment Initiated',
};

function getEventLabel(eventName: string): string {
  return EVENT_LABELS[eventName] || eventName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function FunnelPage() {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch available events from database
  const { data: availableEvents = [] } = useQuery({
    queryKey: ['distinctEvents'],
    queryFn: () => api.getDistinctEvents(),
  });

  // Auto-set default funnel steps when events load
  useEffect(() => {
    if (availableEvents.length >= 2 && steps.length === 0) {
      // Use first 4 events (or fewer if less available)
      const defaultSteps = availableEvents.slice(0, Math.min(4, availableEvents.length)).map(eventName => ({
        name: getEventLabel(eventName),
        eventName,
      }));
      setSteps(defaultSteps);
    }
  }, [availableEvents, steps.length]);

  // Fetch funnel data
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['funnel', steps],
    queryFn: () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return api.analyzeFunnel(steps, thirtyDaysAgo.toISOString(), now.toISOString());
    },
    enabled: steps.length >= 2,
  });

  const addStep = () => {
    const unusedEvent = availableEvents.find(e => !steps.some(s => s.eventName === e));
    if (unusedEvent) {
      setSteps([...steps, { name: getEventLabel(unusedEvent), eventName: unusedEvent }]);
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

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Funnels</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Last 30 days</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--card)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          Customize
        </button>
      </div>

      {/* Step Builder (collapsible) */}
      {showFilters && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 mb-6 shadow-crisp">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[var(--foreground)]">Funnel Steps</h2>
            <button
              onClick={addStep}
              disabled={steps.length >= availableEvents.length}
              className="text-sm text-[var(--primary)] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              + Add Step
            </button>
          </div>
          
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <select
                  value={step.eventName}
                  onChange={(e) => updateStep(index, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
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
                    className="text-[var(--muted)] hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-crisp">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-1">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {funnelData && funnelData.steps && funnelData.steps.length > 0 && (
          <div className="space-y-4">
            {funnelData.steps.map((step, index) => {
              const maxCount = funnelData.steps[0]?.count || 1;
              const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
              const dropoff = index > 0 && funnelData.steps[index - 1].count > 0
                ? Math.round(((funnelData.steps[index - 1].count - step.count) / funnelData.steps[index - 1].count) * 100)
                : 0;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-[var(--foreground)] font-medium">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--muted)] tabular-nums">{step.count.toLocaleString()}</span>
                      <span className="text-[var(--foreground)] font-semibold tabular-nums w-12 text-right">{step.percent}%</span>
                    </div>
                  </div>
                  <div className="h-8 bg-[var(--background)] rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-[var(--primary)] rounded-lg transition-all duration-500"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                  </div>
                  {index > 0 && dropoff > 0 && (
                    <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      {dropoff}% drop-off
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && (!funnelData || !funnelData.steps || funnelData.steps.length === 0) && (
          <p className="text-sm text-[var(--muted)] text-center py-8">
            No events tracked yet. Start sending events to see your funnel.
          </p>
        )}
      </div>
    </div>
  );
}
