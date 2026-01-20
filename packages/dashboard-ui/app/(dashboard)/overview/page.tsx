'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Users, Clock, Target, BarChart3 } from 'lucide-react';

export default function OverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Last 30 days</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl border border-white/10 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-20 bg-gray-700 rounded" />
                <div className="h-4 w-4 bg-gray-700 rounded" />
              </div>
              <div className="h-8 w-24 bg-gray-700 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          Failed to load data. Ensure the API is running.
        </div>
      )}

      {/* Data */}
      {data && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Sessions"
              value={data.totalSessions?.toLocaleString() ?? '0'}
              change="+12%"
              positive
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <StatCard
              label="Unique Users"
              value={data.totalUsers?.toLocaleString() ?? '0'}
              change="+8%"
              positive
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Conversion Rate"
              value={`${((data.conversionRate ?? 0) * 100).toFixed(1)}%`}
              change="+5.2%"
              positive
              icon={<Target className="w-4 h-4" />}
            />
            <StatCard
              label="Avg Duration"
              value={formatDuration(data.avgSessionDuration ?? 0)}
              change="-3%"
              positive={false}
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sessions Trend */}
            <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium text-white mb-6">Daily Sessions</h3>
              <MockLineChart />
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-blue-400 rounded" />
                  <span className="text-gray-400">This period</span>
                </div>
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
              <h3 className="font-medium text-white mb-6">Traffic by Device</h3>
              <MockDonutChart />
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <h3 className="font-medium text-white mb-6">Activity by Hour</h3>
            <MockHeatmap />
            <p className="text-sm text-gray-400 mt-4 text-center">
              Peak activity: <span className="text-white">6 PM - 8 PM</span> on weekdays
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function StatCard({ label, value, change, positive, icon }: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="text-gray-500">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );
}

function MockLineChart() {
  const points = [30, 45, 35, 50, 48, 60, 55, 70, 65, 80, 75, 85, 90, 88];

  return (
    <div className="h-48 flex items-end gap-1">
      {points.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
            style={{ height: `${point}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function MockDonutChart() {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="138 252" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="88 252" strokeDashoffset="-138" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="26 252" strokeDashoffset="-226" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-2xl font-bold text-white">100%</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-300">Mobile (55%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm text-gray-300">Desktop (35%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-300">Tablet (10%)</span>
        </div>
      </div>
    </div>
  );
}

function MockHeatmap() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];
  const data = [
    [0.2, 0.3, 0.4, 0.5, 0.8, 0.4],
    [0.3, 0.4, 0.5, 0.6, 0.9, 0.5],
    [0.3, 0.5, 0.6, 0.7, 0.9, 0.4],
    [0.2, 0.4, 0.5, 0.6, 0.8, 0.4],
    [0.3, 0.5, 0.6, 0.5, 0.7, 0.6],
    [0.1, 0.2, 0.3, 0.4, 0.5, 0.3],
    [0.1, 0.2, 0.3, 0.3, 0.4, 0.2],
  ];

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1 pr-2 text-xs text-gray-400">
        {days.map(d => <div key={d} className="h-8 flex items-center">{d}</div>)}
      </div>
      <div className="flex-1">
        <div className="flex gap-1 mb-2 text-xs text-gray-400">
          {hours.map(h => <div key={h} className="flex-1 text-center">{h}</div>)}
        </div>
        <div className="space-y-1">
          {data.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.map((val, j) => (
                <div
                  key={j}
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${val})` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
