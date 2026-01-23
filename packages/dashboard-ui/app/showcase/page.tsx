'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, TrendingUp, TrendingDown, Users, Clock, Target, MessageCircle, Globe, BarChart3 } from 'lucide-react';

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'whatsapp' | 'journey'>('overview');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold">Dashboard Preview</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-gray-300 hover:text-white transition-colors text-sm">
              Docs
            </Link>
            <Link 
              href="/signup" 
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm"
          >
            Start Free
          </Link>
        </div>
        </div>
      </header>

      {/* Dashboard Preview */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </TabButton>
          <TabButton active={activeTab === 'funnel'} onClick={() => setActiveTab('funnel')}>
            🎯 Funnels
          </TabButton>
          <TabButton active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')}>
            💬 WhatsApp
          </TabButton>
          <TabButton active={activeTab === 'journey'} onClick={() => setActiveTab('journey')}>
            🚶 User Journey
          </TabButton>
        </div>

        {/* Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'funnel' && <FunnelTab />}
        {activeTab === 'whatsapp' && <WhatsAppTab />}
        {activeTab === 'journey' && <JourneyTab />}

        {/* CTA */}
        <div className="mt-12 text-center py-12 border-t border-white/10">
          <h3 className="text-2xl font-bold mb-4">Want to see your own data here?</h3>
          <p className="text-gray-400 mb-6">Set up in 5 minutes. Start seeing insights immediately.</p>
          <Link 
            href="/signup" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all font-medium"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active 
          ? 'bg-white/10 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <div className="text-sm text-gray-400">Last 30 days</div>
      </div>

      {/* Stats Grid - Now 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          label="Total Sessions" 
          value="12,847" 
          change="+18%" 
          positive 
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatCard 
          label="Unique Users" 
          value="8,234" 
          change="+12%" 
          positive 
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard 
          label="Completion Rate" 
          value="42.3%" 
          change="+5.2%" 
          positive 
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard 
          label="Avg. Duration" 
          value="4m 23s" 
          change="-8%" 
          positive={false} 
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard 
          label="Identified Users" 
          value="67%" 
          change="5,517 of 8,234" 
          positive 
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Active Users Chart */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Daily Active Users</h3>
          <MockDailyActiveUsersChart />
        </div>

        {/* Device Breakdown Donut */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Traffic by Device</h3>
          <MockDonutChart />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Browser Breakdown */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Top Browsers</h3>
          <MockBrowserChart />
        </div>

        {/* Traffic by Journey */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Traffic by Journey</h3>
          <MockPagePathsChart />
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-medium mb-6">Activity by Hour</h3>
        <MockHeatmap />
        <p className="text-sm text-gray-400 mt-4 text-center">
          Peak activity: <span className="text-white">6 PM - 8 PM</span> on weekdays
        </p>
      </div>
    </div>
  );
}


// ==================== FUNNEL TAB ====================
function FunnelTab() {
  const funnelSteps = [
    { name: 'Visited Homepage', count: 10000, percent: 100 },
    { name: 'Started Application', count: 6500, percent: 65 },
    { name: 'Validated Identity', count: 5800, percent: 58 },
    { name: 'Verified OTP', count: 5200, percent: 52 },
    { name: 'Submitted Form', count: 4200, percent: 42 },
    { name: 'Completed Payment', count: 3500, percent: 35 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conversion Funnel</h2>
        <select className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option>MRI Tax Filing</option>
          <option>TOT Filing</option>
          <option>NIL Return</option>
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="space-y-4">
          {funnelSteps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{step.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{step.count.toLocaleString()}</span>
                  <span className="font-medium">{step.percent}%</span>
                </div>
              </div>
              <div className="h-8 bg-gray-700/50 rounded-lg overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg transition-all duration-1000"
                  style={{ width: `${step.percent}%` }}
                />
                {i > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    -{funnelSteps[i-1].percent - step.percent}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="mt-8 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <div className="text-yellow-400 mt-0.5">💡</div>
            <div>
              <div className="font-medium text-yellow-400">Biggest Drop-off</div>
              <div className="text-sm text-gray-300 mt-1">
                35% of users drop off between <strong>Homepage</strong> and <strong>Started Application</strong>. 
                Consider adding clearer CTAs or reducing friction.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== WHATSAPP TAB ====================
function WhatsAppTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">WhatsApp Analytics</h2>
        <div className="text-sm text-gray-400">Last 7 days</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Messages Received" 
          value="3,428" 
          change="+24%" 
          positive 
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard 
          label="Avg Response Time" 
          value="3m 12s" 
          change="-15%" 
          positive 
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard 
          label="Read Rate" 
          value="87.3%" 
          change="+2%" 
          positive 
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard 
          label="New Contacts" 
          value="847" 
          change="+31%" 
          positive 
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Response Time Distribution */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Response Time Distribution</h3>
          <MockHistogram />
          <div className="text-sm text-gray-400 mt-4 text-center">
            Median: <span className="text-white">2m 45s</span> • 
            Target: <span className="text-green-400">&lt; 5m</span>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Message Volume by Hour</h3>
          <MockBarChart />
          <div className="text-sm text-gray-400 mt-4 text-center">
            Peak: <span className="text-white">10 AM - 12 PM</span>
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-medium mb-6">Agent Performance</h3>
        <div className="space-y-4">
          {[
            { name: 'Sarah K.', chats: 234, avgTime: '2m 15s', rating: 4.8 },
            { name: 'John M.', chats: 198, avgTime: '3m 02s', rating: 4.6 },
            { name: 'Grace N.', chats: 187, avgTime: '2m 45s', rating: 4.7 },
            { name: 'Peter O.', chats: 156, avgTime: '4m 12s', rating: 4.3 },
          ].map((agent, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-medium text-sm">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-gray-400">{agent.chats} chats resolved</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{agent.avgTime}</div>
                <div className="text-xs text-yellow-400">⭐ {agent.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Funnel & Traffic by Country */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Message Funnel */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Message Funnel</h3>
          <MockMessageFunnel />
        </div>

        {/* Traffic by Country */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Traffic by Country</h3>
          <MockCountryTable />
        </div>
      </div>

      {/* AI Performance Section */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-purple-400">🧠</span>
          <h3 className="text-lg font-semibold">AI Performance</h3>
        </div>

        {/* AI Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label="AI Classifications" 
            value="2,847" 
            change="Last 30 days" 
            positive 
            icon={<Target className="w-4 h-4" />}
          />
          <StatCard 
            label="AI Accuracy" 
            value="94%" 
            change="Avg confidence" 
            positive 
            icon={<Target className="w-4 h-4" />}
          />
          <StatCard 
            label="Avg Latency" 
            value="312ms" 
            change="Fast" 
            positive 
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard 
            label="Error Rate" 
            value="1.2%" 
            change="34 errors" 
            positive 
            icon={<Target className="w-4 h-4" />}
          />
        </div>

        {/* AI Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Intent Breakdown */}
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <h3 className="font-medium mb-6">Top User Intents</h3>
            <MockIntentBreakdown />
          </div>

          {/* AI Latency Distribution */}
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <h3 className="font-medium mb-6">AI Latency Distribution</h3>
            <MockAiLatencyChart />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== JOURNEY TAB ====================
function JourneyTab() {
  const events = [
    { time: '10:00:00', type: 'whatsapp', icon: '📱', event: 'message.received', details: 'User sent: "Hi, I need help with tax filing"' },
    { time: '10:00:15', type: 'whatsapp', icon: '🤖', event: 'message.sent', details: 'Auto-reply: Welcome message + link' },
    { time: '10:00:32', type: 'whatsapp', icon: '👁️', event: 'message.read', details: 'User read the message' },
    { time: '10:01:05', type: 'web', icon: '🌐', event: 'page_view', details: '/mri/validation' },
    { time: '10:01:45', type: 'web', icon: '📝', event: 'validation_success', details: 'ID: A012345678X verified' },
    { time: '10:02:30', type: 'web', icon: '🔐', event: 'otp_verified', details: 'Phone: +254712345678' },
    { time: '10:05:12', type: 'web', icon: '📄', event: 'return_filed', details: 'Receipt: MRI-2026-001234' },
    { time: '10:05:45', type: 'web', icon: '💳', event: 'payment_initiated', details: 'Amount: KES 500' },
    { time: '10:06:23', type: 'web', icon: '✅', event: 'payment_success', details: 'Transaction complete' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Journey</h2>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Search by phone or email..."
            className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm w-64"
          />
        </div>
      </div>

      {/* User Card */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
            JD
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">John Doe</div>
            <div className="text-sm text-gray-400">+254712345678 • john@example.com</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">First seen</div>
            <div className="font-medium">Jan 15, 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-400">WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-gray-400">Web</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-700" />
          <div className="space-y-4">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg relative z-10 ${
                  event.type === 'whatsapp' ? 'bg-green-500/20' : 'bg-blue-500/20'
                }`}>
                  {event.icon}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{event.event}</span>
                    <span className="text-xs text-gray-500">{event.time}</span>
                  </div>
                  <div className="text-sm text-gray-400">{event.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CHART COMPONENTS ====================
function StatCard({ label, value, change, positive, icon }: { 
  label: string; 
  value: string; 
  change: string; 
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="text-gray-500">{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
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
        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
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
          <div className="text-2xl font-bold">12.8K</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm">Mobile (55%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm">Desktop (35%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Tablet (10%)</span>
        </div>
      </div>
    </div>
  );
}

function MockDailyActiveUsersChart() {
  const data = [320, 380, 420, 350, 510, 480, 590, 620, 550, 480, 520, 610, 580, 650, 620, 710, 680, 590, 520, 580, 640, 720, 680, 750, 710, 680, 640, 590, 620, 580];
  const max = Math.max(...data);
  
  return (
    <div className="h-48 flex items-end gap-0.5">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
            Day {i + 1}: {value} users
          </div>
          <div 
            className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-400 hover:to-green-300 transition-colors min-h-[2px]"
            style={{ height: `${(value / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function MockBrowserChart() {
  const browsers = [
    { name: 'Chrome', count: 4520, pct: 55 },
    { name: 'Safari', count: 1890, pct: 23 },
    { name: 'Firefox', count: 820, pct: 10 },
    { name: 'Edge', count: 580, pct: 7 },
    { name: 'Opera', count: 410, pct: 5 },
  ];
  const max = browsers[0].count;
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-2">
      {browsers.map((browser, i) => (
        <div key={browser.name} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">{i + 1}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">{browser.name}</span>
              <span className="text-xs text-gray-400">
                {browser.count.toLocaleString()} <span className="text-gray-500">({browser.pct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-gray-700/30 rounded overflow-hidden">
              <div 
                className="h-full rounded transition-all"
                style={{ width: `${(browser.count / max) * 100}%`, backgroundColor: colors[i] }}
              />
            </div>
          </div>
        </div>
      ))}
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
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${val})`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockHistogram() {
  const bars = [15, 35, 45, 25, 12, 8, 5, 3, 2, 1];
  const labels = ['0-1m', '1-2m', '2-3m', '3-4m', '4-5m', '5-6m', '6-7m', '7-8m', '8-9m', '9+m'];
  
  return (
    <div className="h-32 flex items-end gap-2">
      {bars.map((val, i) => (
        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
          <div 
            className={`w-full rounded-t ${i < 5 ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ height: `${val * 2}%` }}
          />
          <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left translate-y-2">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function MockBarChart() {
  const hours = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm'];
  const values = [15, 35, 85, 65, 45, 55, 75, 45, 20];
  
  return (
    <div className="h-32 flex items-end gap-2">
      {values.map((val, i) => (
        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
          <div 
            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t"
            style={{ height: `${val}%` }}
          />
          <span className="text-xs text-gray-500">{hours[i]}</span>
        </div>
      ))}
    </div>
  );
}

function MockPagePathsChart() {
  const paths = [
    { path: '/', count: 4250, pct: 100 },
    { path: '/mri/validation', count: 2840, pct: 67 },
    { path: '/mri/verify', count: 2120, pct: 50 },
    { path: '/tot/validation', count: 1680, pct: 40 },
    { path: '/pin-registration', count: 1420, pct: 33 },
    { path: '/nil/validation', count: 980, pct: 23 },
  ];

  return (
    <div className="space-y-3">
      {paths.map((item, i) => (
        <div key={item.path} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">{i + 1}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate max-w-[180px]" title={item.path}>{item.path}</span>
              <span className="text-xs text-gray-400">{item.count.toLocaleString()} ({item.pct}%)</span>
            </div>
            <div className="h-2 bg-gray-700/30 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded"
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockMessageFunnel() {
  const stages = [
    { stage: 'Sent', count: 3428, color: '#3B82F6' },
    { stage: 'Delivered', count: 3256, color: '#8B5CF6' },
    { stage: 'Read', count: 2992, color: '#10B981' },
    { stage: 'Replied', count: 1847, color: '#F59E0B' },
  ];
  const max = stages[0].count;

  return (
    <div className="space-y-3">
      {stages.map((item) => (
        <div key={item.stage} className="flex items-center gap-3">
          <div className="w-20 text-sm text-gray-400">{item.stage}</div>
          <div className="flex-1 h-8 bg-gray-700/30 rounded relative overflow-hidden">
            <div 
              className="h-full rounded"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: item.color }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium">
              {item.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
        <span>Delivery: <span className="text-white">95%</span></span>
        <span>Read: <span className="text-white">87%</span></span>
        <span>Reply: <span className="text-white">54%</span></span>
      </div>
    </div>
  );
}

function MockCountryTable() {
  const countries = [
    { code: 'KE', name: 'Kenya', count: 2840, pct: 83 },
    { code: 'UG', name: 'Uganda', count: 290, pct: 8 },
    { code: 'TZ', name: 'Tanzania', count: 180, pct: 5 },
    { code: 'RW', name: 'Rwanda', count: 78, pct: 2 },
    { code: 'Other', name: 'Other', count: 40, pct: 1 },
  ];

  return (
    <div className="space-y-2">
      {countries.map((item, i) => (
        <div key={item.code} className="flex items-center gap-3 p-2 bg-gray-700/20 rounded">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">{i + 1}</div>
          <div className="flex-1 font-medium">{item.name}</div>
          <div className="text-sm text-gray-400">
            {item.count.toLocaleString()} <span className="text-gray-500">({item.pct}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockIntentBreakdown() {
  const intents = [
    { intent: 'nil_filing', count: 456, confidence: 95 },
    { intent: 'pin_registration', count: 312, confidence: 92 },
    { intent: 'etims_query', count: 245, confidence: 88 },
    { intent: 'tcc_application', count: 198, confidence: 91 },
    { intent: 'payment_status', count: 156, confidence: 94 },
  ];
  const max = intents[0].count;

  return (
    <div className="space-y-2">
      {intents.map((item, i) => (
        <div key={item.intent} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">{i + 1}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{item.intent.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-400">
                {item.count} <span className="text-purple-400">({item.confidence}%)</span>
              </span>
            </div>
            <div className="h-2 bg-gray-700/30 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockAiLatencyChart() {
  const buckets = [
    { label: '0-100', count: 45, fast: true },
    { label: '100-200', count: 78, fast: true },
    { label: '200-500', count: 32, fast: true },
    { label: '500-1000', count: 12, fast: false },
    { label: '1000+', count: 5, fast: false },
  ];
  const max = Math.max(...buckets.map(b => b.count));

  return (
    <div className="h-32 flex items-end gap-2">
      {buckets.map((item) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className={`w-full rounded-t ${item.fast ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-amber-600 to-amber-400'}`}
            style={{ height: `${(item.count / max) * 100}%` }}
          />
          <span className="text-[9px] text-gray-500">{item.label}ms</span>
        </div>
      ))}
    </div>
  );
}
