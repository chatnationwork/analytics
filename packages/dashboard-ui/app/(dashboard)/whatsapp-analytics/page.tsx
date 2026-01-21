'use client';

import { useQuery } from '@tanstack/react-query';
import { whatsappAnalyticsApi } from '@/lib/whatsapp-analytics-api';
import { TrendingUp, TrendingDown, MessageCircle, Clock, Target, Users } from 'lucide-react';

export default function WhatsAppAnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: () => whatsappAnalyticsApi.getStats(),
  });

  const { data: volume } = useQuery({
    queryKey: ['whatsapp-volume'],
    queryFn: () => whatsappAnalyticsApi.getVolume(),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['whatsapp-heatmap'],
    queryFn: () => whatsappAnalyticsApi.getHeatmap(),
  });

  const { data: agents } = useQuery({
    queryKey: ['whatsapp-agents'],
    queryFn: () => whatsappAnalyticsApi.getAgents(),
  });

  const { data: countries } = useQuery({
    queryKey: ['whatsapp-countries'],
    queryFn: () => whatsappAnalyticsApi.getCountries(),
  });

  const { data: responseTime } = useQuery({
    queryKey: ['whatsapp-response-time'],
    queryFn: () => whatsappAnalyticsApi.getResponseTime(),
  });

  const { data: funnel } = useQuery({
    queryKey: ['whatsapp-funnel'],
    queryFn: () => whatsappAnalyticsApi.getFunnel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">WhatsApp Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Insights from WhatsApp events we collect</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Messages Received"
          value={stats?.messagesReceived?.toLocaleString() ?? '0'}
          change="Last 30 days"
          positive
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Messages Sent"
          value={stats?.messagesSent?.toLocaleString() ?? '0'}
          change="Last 30 days"
          positive
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Read Rate"
          value={`${Math.round(stats?.readRate ?? 0)}%`}
          change="vs Sent"
          positive
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="New Contacts"
          value={stats?.newContacts?.toLocaleString() ?? '0'}
          change="Last 30 days"
          positive
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Response Time Distribution */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Response Time Distribution</h3>
          <ResponseTimeHistogram data={responseTime?.distribution ?? []} />
          <div className="text-sm text-gray-400 mt-4 text-center">
            Median: <span className="text-white">{responseTime?.medianMinutes ? `${responseTime.medianMinutes.toFixed(1)}m` : '--'}</span> • 
            Target: <span className="text-green-400">&lt; 5m</span>
          </div>
        </div>

        {/* Volume by Hour */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Message Volume by Hour</h3>
          <VolumeChart data={volume ?? []} />
          <div className="text-sm text-gray-400 mt-4 text-center">
             (UTC time)
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-medium text-white mb-6">Activity by Day & Hour</h3>
        <HeatmapChart data={heatmap ?? []} />
        <p className="text-sm text-gray-400 mt-4 text-center">
          Heatmap based on message volume
        </p>
      </div>

      {/* Message Funnel & Country Breakdown Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Message Funnel */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Message Funnel</h3>
          <MessageFunnel data={funnel?.funnel ?? []} rates={funnel?.rates} />
        </div>

        {/* Country Breakdown */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium text-white mb-6">Traffic by Country</h3>
          <CountryTable data={countries ?? []} />
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-medium text-white mb-6">Agent Performance</h3>
        <div className="space-y-3">
          {agents?.map((agent: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-medium text-sm text-white">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{agent.agentId}</div>
                <div className="text-sm text-gray-400">{agent.chatCount} chats resolved</div>
              </div>
            </div>
          ))}
          {(!agents || agents.length === 0) && (
            <p className="text-gray-400 text-center text-sm py-4">No agent data available</p>
          )}
        </div>
      </div>

      {/* Note about data source */}
      <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 mt-0.5">ℹ️</div>
          <div>
            <div className="font-medium text-blue-400">About This Data</div>
            <div className="text-sm text-gray-300 mt-1">
              This page shows analytics from WhatsApp events sent to our collector. 
              For CRM-specific data (contacts, campaigns), visit{' '}
              <a href="/whatsapp" className="text-blue-400 hover:underline">WhatsApp CRM</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
      <div className={`text-sm flex items-center gap-1 ${positive ? 'text-green-400' : 'text-gray-400'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : null}
        {change}
      </div>
    </div>
  );
}

function ResponseTimeHistogram({ data }: { data: { bucket: string; count: string }[] }) {
  const buckets = ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9+'];
  const counts = buckets.map(b => {
    const found = data.find(d => d.bucket === b);
    return found ? parseInt(found.count, 10) : 0;
  });
  const max = Math.max(...counts, 1);

  if (counts.every(c => c === 0)) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
        No response time data available
      </div>
    );
  }

  return (
    <div className="h-32 flex items-end gap-1">
      {counts.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className={`w-full rounded-t min-h-[2px] ${i < 5 ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-amber-600 to-amber-400'}`}
            style={{ height: `${(val / max) * 100}%` }}
          />
          <span className="text-[9px] text-gray-500">{buckets[i]}m</span>
          {val > 0 && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {val}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MessageFunnel({ data, rates }: { data: { stage: string; count: number }[]; rates?: { deliveryRate: number; readRate: number; replyRate: number } }) {
  if (!data.length) {
    return <div className="text-gray-500 text-sm text-center py-8">No funnel data available</div>;
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.stage} className="flex items-center gap-3">
          <div className="w-20 text-sm text-gray-400">{item.stage}</div>
          <div className="flex-1 h-8 bg-gray-700/30 rounded relative overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: colors[i % colors.length] }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-white font-medium">
              {item.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      {rates && (
        <div className="flex justify-between text-xs text-gray-400 mt-4 pt-3 border-t border-white/5">
          <span>Delivery: <span className="text-white">{rates.deliveryRate.toFixed(1)}%</span></span>
          <span>Read: <span className="text-white">{rates.readRate.toFixed(1)}%</span></span>
          <span>Reply: <span className="text-white">{rates.replyRate.toFixed(1)}%</span></span>
        </div>
      )}
    </div>
  );
}

function CountryTable({ data }: { data: { countryCode: string; count: number }[] }) {
  if (!data.length) {
    return <div className="text-gray-500 text-sm text-center py-8">No country data available</div>;
  }

  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.slice(0, 10).map((item, i) => (
        <div key={item.countryCode} className="flex items-center gap-3 p-2 bg-gray-700/20 rounded">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">{i + 1}</div>
          <div className="flex-1 font-medium text-white">{item.countryCode || 'Unknown'}</div>
          <div className="text-sm text-gray-400">
            {item.count.toLocaleString()} <span className="text-gray-500">({((item.count / total) * 100).toFixed(1)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VolumeChart({ data }: { data: any[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // data is [{ hour: '14', count: '5' }]
  const counts = hours.map(h => {
    const found = data.find(d => Number(d.hour) === h);
    return found ? Number(found.count) : 0;
  });
  
  const max = Math.max(...counts, 1);

  return (
    <div className="h-32 flex items-end gap-1">
      {counts.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t min-h-[1px]"
            style={{ height: `${(val / max) * 100}%` }}
          />
          {i % 3 === 0 && <span className="text-[10px] text-gray-500">{i}h</span>}
          {val > 0 && (
             <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
               {val}
             </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeatmapChart({ data }: { data: any[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];
  
  // Create 7x24 grid
  const grid = Array(7).fill(0).map(() => Array(24).fill(0));
  let max = 1;
  
  data.forEach(d => {
    const day = Number(d.day);
    const hour = Number(d.hour);
    const count = Number(d.count);
    if (grid[day] && grid[day][hour] !== undefined) {
      grid[day][hour] = count;
      if (count > max) max = count;
    }
  });

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1 pr-2 text-xs text-gray-400">
        {days.map(d => <div key={d} className="h-6 flex items-center">{d}</div>)}
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-1 mb-2 text-xs text-gray-400 min-w-[600px]">
          {Array.from({ length: 24 }, (_, i) => i).map(h => (
            <div key={h} className="flex-1 text-center">{h}</div>
          ))}
        </div>
        <div className="space-y-1 min-w-[600px]">
          {grid.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.map((val, j) => (
                <div
                  key={j}
                  className="flex-1 h-6 rounded"
                  style={{ 
                    backgroundColor: val > 0 ? `rgba(34, 197, 94, ${Math.max(val / max, 0.2)})` : 'rgba(255, 255, 255, 0.05)',
                  }}
                  title={`${days[i]} ${j}:00 - ${val} messages`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
