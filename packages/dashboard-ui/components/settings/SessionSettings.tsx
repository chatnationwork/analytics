"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";

/** Max session duration is fixed at 7 days (not configurable in UI). */
const MAX_SESSION_DURATION_MINUTES = 7 * 24 * 60; // 10080

interface SessionSettingsData {
  inactivityTimeoutMinutes: number;
  sessionsRevokedAt?: string;
}

/** Resolved chats in Inbox: 0 = all time, 1/7/30 = last N days. Default 1. */
const RESOLVED_CHATS_OPTIONS = [
  { value: 1, label: "Last 1 day (default)" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 0, label: "All time" },
] as const;

type TimeUnit = "minutes" | "hours" | "days";

interface TimeValue {
  value: number;
  unit: TimeUnit;
}

/** Convert minutes to the most appropriate unit for display */
function minutesToTimeValue(minutes: number): TimeValue {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: "days" };
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: "hours" };
  }
  return { value: minutes, unit: "minutes" };
}

/** Convert time value back to minutes */
function timeValueToMinutes(tv: TimeValue): number {
  switch (tv.unit) {
    case "days":
      return tv.value * 1440;
    case "hours":
      return tv.value * 60;
    default:
      return tv.value;
  }
}

interface DurationInputProps {
  value: number; // in minutes
  onChange: (minutes: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
  label: string;
  description: string;
}

function DurationInput({
  value,
  onChange,
  minMinutes = 1,
  maxMinutes,
  label,
  description,
}: DurationInputProps) {
  const [timeValue, setTimeValue] = useState<TimeValue>(() =>
    minutesToTimeValue(value),
  );
  const inputId = label.toLowerCase().replace(/\s+/g, "-") + "-value";
  const selectId = label.toLowerCase().replace(/\s+/g, "-") + "-unit";

  // Sync internal state when prop changes (e.g., on load)
  useEffect(() => {
    setTimeValue(minutesToTimeValue(value));
  }, [value]);

  const handleValueChange = (newValue: number) => {
    const updated = { ...timeValue, value: newValue };
    setTimeValue(updated);
    const minutes = timeValueToMinutes(updated);
    if (minutes >= minMinutes && (!maxMinutes || minutes <= maxMinutes)) {
      onChange(minutes);
    }
  };

  const handleUnitChange = (newUnit: TimeUnit) => {
    const updated = { ...timeValue, unit: newUnit };
    setTimeValue(updated);
    const minutes = timeValueToMinutes(updated);
    if (minutes >= minMinutes && (!maxMinutes || minutes <= maxMinutes)) {
      onChange(minutes);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="number"
          min={1}
          value={timeValue.value}
          onChange={(e) =>
            handleValueChange(Math.max(1, parseInt(e.target.value) || 1))
          }
          aria-label={`${label} value`}
          className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <select
          id={selectId}
          value={timeValue.unit}
          onChange={(e) => handleUnitChange(e.target.value as TimeUnit)}
          aria-label={`${label} unit`}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function SessionSettings({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<SessionSettingsData>({
    inactivityTimeoutMinutes: 30,
  });
  const [resolvedChatsPeriodDays, setResolvedChatsPeriodDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchWithAuth("/tenants/current")
      .then(
        (data: {
          settings?: {
            session?: SessionSettingsData & { maxDurationMinutes?: number };
            inbox?: { resolvedChatsPeriodDays?: number };
          };
        }) => {
          if (data?.settings?.session) {
            const session = data.settings.session;
            setSettings({
              inactivityTimeoutMinutes: session.inactivityTimeoutMinutes ?? 30,
              sessionsRevokedAt: session.sessionsRevokedAt,
            });
          }
          const period = data?.settings?.inbox?.resolvedChatsPeriodDays;
          setResolvedChatsPeriodDays(typeof period === "number" ? period : 1);
        },
      )
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (settings.inactivityTimeoutMinutes >= MAX_SESSION_DURATION_MINUTES) {
      alert(
        `Inactivity timeout must be less than ${MAX_SESSION_DURATION_MINUTES / 60 / 24} days.`,
      );
      return;
    }

    setLoading(true);
    setSuccess(false);
    try {
      await fetchWithAuth("/tenants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            session: {
              maxDurationMinutes: MAX_SESSION_DURATION_MINUTES,
              inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
              ...(settings.sessionsRevokedAt && {
                sessionsRevokedAt: settings.sessionsRevokedAt,
              }),
            },
            inbox: {
              resolvedChatsPeriodDays: resolvedChatsPeriodDays,
            },
          },
        }),
      });
      setSuccess(true);
      // Reload to apply new session settings immediately
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("Are you sure? This will log out all users immediately."))
      return;

    setLoading(true);
    try {
      const newSettings = {
        ...settings,
        sessionsRevokedAt: new Date().toISOString(),
      };

      await fetchWithAuth("/tenants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            session: {
              maxDurationMinutes: MAX_SESSION_DURATION_MINUTES,
              inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
              sessionsRevokedAt: newSettings.sessionsRevokedAt,
            },
          },
        }),
      });

      setSettings(newSettings);
      alert(
        "All sessions have been revoked. Users will be logged out on their next request.",
      );
    } catch (err) {
      console.error(err);
      alert("Failed to revoke sessions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">
          Session Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure session duration and timeouts.
        </p>
      </div>

      <div className="grid gap-6 max-w-md">
        <DurationInput
          value={settings.inactivityTimeoutMinutes}
          onChange={(minutes) =>
            setSettings({ ...settings, inactivityTimeoutMinutes: minutes })
          }
          minMinutes={1}
          maxMinutes={10079}
          label="Inactivity Timeout"
          description="Auto-logout after idle time. Takes effect immediately. Sessions expire after 7 days at most."
        />

        <div className="space-y-2">
          <label
            htmlFor="resolved-chats-period"
            className="text-sm font-medium"
          >
            Resolved chats in Inbox
          </label>
          <select
            id="resolved-chats-period"
            value={resolvedChatsPeriodDays}
            onChange={(e) => setResolvedChatsPeriodDays(Number(e.target.value))}
            aria-label="How long resolved chats are shown in the Inbox"
            className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm"
          >
            {RESOLVED_CHATS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            How far back to show resolved chats in the agent Inbox. Default:
            last 1 day.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
          {success && (
            <span className="ml-3 text-green-600 text-sm">Saved!</span>
          )}
        </div>
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="text-red-600 font-medium mb-2">Danger Zone</h3>
        <button
          onClick={handleLogoutAll}
          disabled={loading}
          className="border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-10 px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          Log out all users
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Forces all users (including you) to log in again.
        </p>
      </div>
    </div>
  );
}
