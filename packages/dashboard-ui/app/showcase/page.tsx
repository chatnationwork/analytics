"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  MessageCircle,
  Globe,
  BarChart3,
  Bot,
  UserCheck,
  Activity,
  Brain,
  Zap,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Inbox,
  Award,
} from "lucide-react";

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "trends"
    | "funnel"
    | "whatsapp"
    | "selfserve"
    | "agents"
    | "journey"
    | "csat"
  >("overview");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold">Shuru Connect · Preview</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Dashboard Preview */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </TabButton>
          <TabButton
            active={activeTab === "trends"}
            onClick={() => setActiveTab("trends")}
          >
            📈 Trends
          </TabButton>
          <TabButton
            active={activeTab === "funnel"}
            onClick={() => setActiveTab("funnel")}
          >
            🎯 Funnels
          </TabButton>
          <TabButton
            active={activeTab === "whatsapp"}
            onClick={() => setActiveTab("whatsapp")}
          >
            💬 WhatsApp
          </TabButton>
          <TabButton
            active={activeTab === "selfserve"}
            onClick={() => setActiveTab("selfserve")}
          >
            🤖 Self-Serve
          </TabButton>
          <TabButton
            active={activeTab === "agents"}
            onClick={() => setActiveTab("agents")}
          >
            👥 Agent Analytics
          </TabButton>
          <TabButton
            active={activeTab === "journey"}
            onClick={() => setActiveTab("journey")}
          >
            🚶 User Journey
          </TabButton>
        </div>

        {/* Content */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "trends" && <TrendsTab />}
        {activeTab === "funnel" && <FunnelTab />}
        {activeTab === "whatsapp" && <WhatsAppTab />}
        {activeTab === "selfserve" && <SelfServeTab />}
        {activeTab === "agents" && <AgentAnalyticsTab />}
        {activeTab === "journey" && <JourneyTab />}
        {activeTab === "csat" && <CsatTab />}

        {/* CTA */}
        <div className="mt-12 text-center py-12 border-t border-white/10">
          <h3 className="text-2xl font-bold mb-4">
            Log in to see Shuru Connect with your data
          </h3>
          <p className="text-gray-400 mb-6">
            Funnels, journeys, CSAT, agent inbox, and reports in one place.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all font-medium"
          >
            Log in
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:text-white hover:bg-white/5"
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
          Peak activity: <span className="text-white">6 PM - 8 PM</span> on
          weekdays
        </p>
      </div>
    </div>
  );
}

// ==================== TRENDS TAB ====================
function TrendsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics Trends</h2>
        <select className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      {/* Session Trend */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Session Trend</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Total sessions over time
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            +18.3%
          </div>
        </div>
        <MockSessionTrendChart />
      </div>

      {/* Conversion & User Growth Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Conversion Rate Trend */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Conversion Rate Trend</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Goal completions over time
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">42.3%</div>
              <div className="text-xs text-gray-400">Avg Rate</div>
            </div>
          </div>
          <MockConversionTrendChart />
        </div>

        {/* User Growth Trend */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">User Growth</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                New vs returning users
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">8,234</div>
              <div className="text-xs text-gray-400">Total Users</div>
            </div>
          </div>
          <MockUserGrowthChart />
        </div>
      </div>

      {/* AI & Agent Trends */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">
            AI & Agent Performance Trends
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* AI Classification Trend */}
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">AI Classifications</h3>
                <p className="text-sm text-gray-400 mt-0.5">Volume over time</p>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                +24.5%
              </div>
            </div>
            <MockAiClassificationTrendChart />
          </div>

          {/* AI Latency Trend */}
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">AI Latency Trend</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  P50 & P95 over time
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">312ms</div>
                <div className="text-xs text-gray-400">Avg P50</div>
              </div>
            </div>
            <MockAiLatencyTrendChart />
          </div>
        </div>

        {/* Agent Resolved Trend */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Agent Chats Resolved</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Productivity over time
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-bold">1,847</div>
                <div className="text-xs text-gray-400">Total Resolved</div>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                +12.8%
              </div>
            </div>
          </div>
          <MockAgentResolvedTrendChart />
        </div>
      </div>
    </div>
  );
}

// ==================== SELF-SERVE TAB ====================
function SelfServeTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Self-Serve Analytics</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Self-serve vs assisted journey breakdown
          </p>
        </div>
        <select className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value="12,847"
          change="Last 30 days"
          positive
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Self-Serve Rate"
          value="73.2%"
          change="+5.4%"
          positive
          icon={<Bot className="w-4 h-4" />}
        />
        <StatCard
          label="Assisted Rate"
          value="26.8%"
          change="-5.4%"
          positive
          icon={<UserCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Time to Handoff"
          value="2m 34s"
          change="P95: 8m 12s"
          positive
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Journey Breakdown & Trend */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-2">Journey Breakdown</h3>
          <p className="text-sm text-gray-400 mb-6">
            Self-serve vs assisted sessions
          </p>
          <MockSelfServeDonutChart />
        </div>

        {/* Trend Chart */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Session Trend</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Self-serve vs assisted over time
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">26.8%</div>
              <div className="text-xs text-gray-400">Avg Handoff Rate</div>
            </div>
          </div>
          <MockSelfServeTrendChart />
        </div>
      </div>

      {/* Handoff Rate Trend */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Handoff Rate Trend</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Percentage of sessions escalated to agents
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <TrendingDown className="w-4 h-4" />
            -3.2% (improving)
          </div>
        </div>
        <MockHandoffRateTrendChart />
      </div>

      {/* Handoff Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Handoff by Step */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-2">Handoffs by Journey Step</h3>
          <p className="text-sm text-gray-400 mb-6">
            Which steps lead to agent handoffs
          </p>
          <MockHandoffByStepChart />
        </div>

        {/* Handoff Reasons */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-2">Handoff Reasons</h3>
          <p className="text-sm text-gray-400 mb-6">
            Why users are transferred to agents
          </p>
          <MockHandoffReasonsChart />
        </div>
      </div>

      {/* Top Agents */}
      <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-medium">Agent Performance</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Handoff distribution across agents
            </p>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <span>
              <strong className="text-white">12</strong> agents
            </span>
            <span>
              <strong className="text-white">287</strong> avg/agent
            </span>
          </div>
        </div>
        <MockTopAgentsLeaderboard />
      </div>
    </div>
  );
}

// ==================== FUNNEL TAB ====================
function FunnelTab() {
  const funnelSteps = [
    { name: "Visited Homepage", count: 10000, percent: 100 },
    { name: "Started Application", count: 6500, percent: 65 },
    { name: "Validated Identity", count: 5800, percent: 58 },
    { name: "Verified OTP", count: 5200, percent: 52 },
    { name: "Submitted Form", count: 4200, percent: 42 },
    { name: "Completed Payment", count: 3500, percent: 35 },
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
                  <span className="text-gray-400">
                    {step.count.toLocaleString()}
                  </span>
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
                    -{funnelSteps[i - 1].percent - step.percent}%
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
              <div className="font-medium text-yellow-400">
                Biggest Drop-off
              </div>
              <div className="text-sm text-gray-300 mt-1">
                35% of users drop off between <strong>Homepage</strong> and{" "}
                <strong>Started Application</strong>. Consider adding clearer
                CTAs or reducing friction.
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
            Median: <span className="text-white">2m 45s</span> • Target:{" "}
            <span className="text-green-400">&lt; 5m</span>
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
            { name: "Sarah K.", chats: 234, avgTime: "2m 15s", rating: 4.8 },
            { name: "John M.", chats: 198, avgTime: "3m 02s", rating: 4.6 },
            { name: "Grace N.", chats: 187, avgTime: "2m 45s", rating: 4.7 },
            { name: "Peter O.", chats: 156, avgTime: "4m 12s", rating: 4.3 },
          ].map((agent, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-medium text-sm">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-gray-400">
                  {agent.chats} chats resolved
                </div>
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

// ==================== AGENT ANALYTICS TAB ====================
function AgentAnalyticsTab() {
  // Mock data
  const agentActivityData = [
    { period: "Jan 1", activeAgents: 4, resolutions: 12, handoffs: 18 },
    { period: "Jan 2", activeAgents: 5, resolutions: 15, handoffs: 20 },
    { period: "Jan 3", activeAgents: 6, resolutions: 22, handoffs: 28 },
    { period: "Jan 4", activeAgents: 5, resolutions: 18, handoffs: 24 },
    { period: "Jan 5", activeAgents: 7, resolutions: 25, handoffs: 32 },
    { period: "Jan 6", activeAgents: 6, resolutions: 20, handoffs: 26 },
    { period: "Jan 7", activeAgents: 8, resolutions: 30, handoffs: 38 },
  ];

  const agentDetails = [
    {
      agentId: "a1b2c3d4",
      resolvedCount: 45,
      handoffsReceived: 52,
      transfersOut: 3,
      totalChats: 55,
      resolutionRate: 86.5,
    },
    {
      agentId: "e5f6g7h8",
      resolvedCount: 38,
      handoffsReceived: 48,
      transfersOut: 5,
      totalChats: 53,
      resolutionRate: 79.2,
    },
    {
      agentId: "i9j0k1l2",
      resolvedCount: 32,
      handoffsReceived: 42,
      transfersOut: 8,
      totalChats: 50,
      resolutionRate: 76.2,
    },
    {
      agentId: "m3n4o5p6",
      resolvedCount: 28,
      handoffsReceived: 38,
      transfersOut: 4,
      totalChats: 42,
      resolutionRate: 73.7,
    },
    {
      agentId: "q7r8s9t0",
      resolvedCount: 22,
      handoffsReceived: 35,
      transfersOut: 10,
      totalChats: 45,
      resolutionRate: 62.9,
    },
  ];

  const resolutionCategories = [
    { category: "Inquiry Answered", count: 45, percentage: 35 },
    { category: "Issue Resolved", count: 32, percentage: 25 },
    { category: "Order Completed", count: 25, percentage: 19.5 },
    { category: "No Response", count: 15, percentage: 11.7 },
    { category: "Other", count: 11, percentage: 8.8 },
  ];

  const transferReasons = [
    { reason: "Specialist needed", count: 18, percentage: 40 },
    { reason: "Language preference", count: 12, percentage: 26.7 },
    { reason: "Shift handover", count: 8, percentage: 17.8 },
    { reason: "Escalation", count: 7, percentage: 15.5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agent Analytics</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Team performance, resolutions, and workload metrics
          </p>
        </div>
        <div className="text-sm text-gray-400">Last 30 days</div>
      </div>

      {/* Stats Grid - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Agents"
          value="8"
          change="+2"
          positive
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Resolution Rate"
          value="78.4%"
          change="+5.2%"
          positive
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Chats Resolved"
          value="165"
          change="+24%"
          positive
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Chats Transferred"
          value="45"
          change="-12%"
          positive
          icon={<ArrowRightLeft className="w-4 h-4" />}
        />
      </div>

      {/* Stats Grid - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Chats"
          value="24"
          change="+8"
          positive
          icon={<Inbox className="w-4 h-4" />}
        />
        <StatCard
          label="Expired Chats"
          value="3"
          change="-2"
          positive
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label="Workload Balance"
          value="82%"
          change="+5%"
          positive
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatCard
          label="Peak Active Agents"
          value="8"
          change="+1"
          positive
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Resolution Trend */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium">Resolutions Over Time</h3>
            <span className="text-sm text-gray-400">Total: 165</span>
          </div>
          <MockAgentResolutionChart />
        </div>

        {/* Agent Activity */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h3 className="font-medium">Agent Activity</h3>
            </div>
            <span className="text-sm text-gray-400">Peak: 8</span>
          </div>
          <MockAgentActivityChart data={agentActivityData} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Resolution Categories */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Resolution Categories</h3>
          <MockBreakdownChart
            data={resolutionCategories}
            colors={[
              "bg-green-500",
              "bg-blue-500",
              "bg-purple-500",
              "bg-amber-500",
              "bg-pink-500",
            ]}
          />
        </div>

        {/* Transfer Reasons */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Transfer Reasons</h3>
          <MockBreakdownChart
            data={transferReasons}
            colors={[
              "bg-blue-500",
              "bg-purple-500",
              "bg-amber-500",
              "bg-cyan-500",
            ]}
          />
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Chat Status Donut */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Current Chat Status</h3>
          <MockChatStatusDonut />
        </div>

        {/* Agent Leaderboard */}
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-yellow-500" />
            <h3 className="font-medium">Top Performers</h3>
          </div>
          <MockAgentLeaderboard data={agentDetails} />
        </div>
      </div>

      {/* Agent Performance Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Agent Performance Details</h2>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium">All Agents</h3>
            <span className="text-sm text-gray-400">5 agents • 245 chats</span>
          </div>
          <MockAgentDetailsTable data={agentDetails} />
        </div>
      </div>
    </div>
  );
}

// Mock Agent Resolution Chart
function MockAgentResolutionChart() {
  const data = [18, 22, 28, 24, 32, 26, 15];
  const maxValue = Math.max(...data);

  return (
    <div className="h-48">
      <div className="h-full flex items-end gap-2">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all hover:from-green-500 hover:to-green-300"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Jan 1</span>
        <span>Jan 7</span>
      </div>
    </div>
  );
}

// Mock Agent Activity Chart
function MockAgentActivityChart({
  data,
}: {
  data: {
    period: string;
    activeAgents: number;
    resolutions: number;
    handoffs: number;
  }[];
}) {
  const maxAgents = Math.max(...data.map((d) => d.activeAgents));

  return (
    <div className="h-48">
      <div className="h-full flex items-end gap-2">
        {data.map((point, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:from-purple-500 hover:to-purple-300"
              style={{ height: `${(point.activeAgents / maxAgents) * 100}%` }}
            />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-10 border border-white/10">
              <div className="font-medium">
                {point.activeAgents} active agents
              </div>
              <div className="text-gray-400">
                {point.resolutions} resolved • {point.handoffs} handoffs
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{data[0]?.period}</span>
        <span>{data[data.length - 1]?.period}</span>
      </div>
    </div>
  );
}

// Mock Breakdown Chart (for categories and reasons)
function MockBreakdownChart({
  data,
  colors,
}: {
  data: {
    category?: string;
    reason?: string;
    count: number;
    percentage: number;
  }[];
  colors: string[];
}) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white">{item.category || item.reason}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{item.count}</span>
              <span className="text-white font-medium w-12 text-right">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Mock Chat Status Donut
function MockChatStatusDonut() {
  const segments = [
    { value: 24, color: "#22c55e", label: "Active" },
    { value: 165, color: "#3b82f6", label: "Resolved" },
    { value: 3, color: "#f59e0b", label: "Expired" },
    { value: 12, color: "#6b7280", label: "Unassigned" },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="16"
          />
          {segments.map((seg, i) => {
            const pct = (seg.value / total) * 100;
            const arc = (pct / 100) * circumference;
            const currentOffset = offset;
            offset += arc;
            if (seg.value === 0) return null;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-400">{seg.label}</span>
            <span className="font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mock Agent Leaderboard
function MockAgentLeaderboard({
  data,
}: {
  data: {
    agentId: string;
    resolvedCount: number;
    handoffsReceived: number;
    transfersOut: number;
    totalChats: number;
    resolutionRate: number;
  }[];
}) {
  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((agent, i) => (
        <div
          key={agent.agentId}
          className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
              i === 0
                ? "bg-yellow-500/20 text-yellow-500"
                : i === 1
                  ? "bg-gray-400/20 text-gray-400"
                  : i === 2
                    ? "bg-amber-600/20 text-amber-600"
                    : "bg-gray-700 text-gray-400"
            }`}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{agent.agentId}...</div>
            <div className="text-xs text-gray-400">
              {agent.resolvedCount} resolved • {agent.handoffsReceived} received
              • {agent.transfersOut} transferred
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">
              {agent.resolvedCount}
            </div>
            <div className="text-xs text-gray-400">resolved</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mock Agent Details Table
function MockAgentDetailsTable({
  data,
}: {
  data: {
    agentId: string;
    resolvedCount: number;
    handoffsReceived: number;
    transfersOut: number;
    totalChats: number;
    resolutionRate: number;
  }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-xs font-medium text-gray-400 py-3 px-2">
              Agent
            </th>
            <th className="text-right text-xs font-medium text-gray-400 py-3 px-2">
              Resolved
            </th>
            <th className="text-right text-xs font-medium text-gray-400 py-3 px-2">
              Received
            </th>
            <th className="text-right text-xs font-medium text-gray-400 py-3 px-2">
              Transferred
            </th>
            <th className="text-right text-xs font-medium text-gray-400 py-3 px-2">
              Total
            </th>
            <th className="text-right text-xs font-medium text-gray-400 py-3 px-2">
              Resolution Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((agent) => (
            <tr
              key={agent.agentId}
              className="border-b border-white/5 hover:bg-white/5"
            >
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[100px]">
                    {agent.agentId}...
                  </span>
                </div>
              </td>
              <td className="text-right text-sm py-3 px-2">
                {agent.resolvedCount}
              </td>
              <td className="text-right text-sm py-3 px-2">
                {agent.handoffsReceived}
              </td>
              <td className="text-right text-sm py-3 px-2">
                {agent.transfersOut}
              </td>
              <td className="text-right text-sm font-medium py-3 px-2">
                {agent.totalChats}
              </td>
              <td className="text-right py-3 px-2">
                <span
                  className={`text-sm font-medium ${
                    agent.resolutionRate >= 80
                      ? "text-green-400"
                      : agent.resolutionRate >= 60
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {agent.resolutionRate.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== JOURNEY TAB ====================
function JourneyTab() {
  const events = [
    {
      time: "10:00:00",
      type: "whatsapp",
      icon: "📱",
      event: "message.received",
      details: 'User sent: "Hi, I need help with tax filing"',
    },
    {
      time: "10:00:15",
      type: "whatsapp",
      icon: "🤖",
      event: "message.sent",
      details: "Auto-reply: Welcome message + link",
    },
    {
      time: "10:00:32",
      type: "whatsapp",
      icon: "👁️",
      event: "message.read",
      details: "User read the message",
    },
    {
      time: "10:01:05",
      type: "web",
      icon: "🌐",
      event: "page_view",
      details: "/mri/validation",
    },
    {
      time: "10:01:45",
      type: "web",
      icon: "📝",
      event: "validation_success",
      details: "ID: A012345678X verified",
    },
    {
      time: "10:02:30",
      type: "web",
      icon: "🔐",
      event: "otp_verified",
      details: "Phone: +254712345678",
    },
    {
      time: "10:05:12",
      type: "web",
      icon: "📄",
      event: "return_filed",
      details: "Receipt: MRI-2026-001234",
    },
    {
      time: "10:05:45",
      type: "web",
      icon: "💳",
      event: "payment_initiated",
      details: "Amount: KES 500",
    },
    {
      time: "10:06:23",
      type: "web",
      icon: "✅",
      event: "payment_success",
      details: "Transaction complete",
    },
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
            <div className="text-sm text-gray-400">
              +254712345678 • john@example.com
            </div>
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
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg relative z-10 ${
                    event.type === "whatsapp"
                      ? "bg-green-500/20"
                      : "bg-blue-500/20"
                  }`}
                >
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

// ==================== CSAT TAB ====================
function CsatTab() {
  const distribution = [
    { score: 5, count: 842, pct: 42 },
    { score: 4, count: 612, pct: 31 },
    { score: 3, count: 298, pct: 15 },
    { score: 2, count: 156, pct: 8 },
    { score: 1, count: 92, pct: 5 },
  ];
  const recentFeedback = [
    {
      rating: 5,
      feedback: "Very quick and helpful, issue resolved.",
      date: "2 hours ago",
    },
    {
      rating: 4,
      feedback: "Good experience. Would be better with shorter wait.",
      date: "5 hours ago",
    },
    { rating: 5, feedback: "Excellent service.", date: "1 day ago" },
    {
      rating: 3,
      feedback: "Took a while to get through but got there in the end.",
      date: "1 day ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">CSAT Analytics</h2>
        <select className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Average score"
          value="4.2"
          change="+0.3 vs previous"
          positive
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          label="Total responses"
          value="2,000"
          change="+18%"
          positive
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="5-star rate"
          value="42%"
          change="+4%"
          positive
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Trend"
          value="+5.2%"
          change="vs last period"
          positive
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Score distribution</h3>
          <div className="space-y-3">
            {distribution.map((row) => (
              <div key={row.score} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-8">{row.score} ★</span>
                <div className="flex-1 h-6 bg-gray-700/50 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 w-16 text-right">
                  {row.count} ({row.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-6">Recent feedback</h3>
          <div className="space-y-4">
            {recentFeedback.map((item, i) => (
              <div key={i} className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-400">
                    {"★".repeat(item.rating)}
                    {"☆".repeat(5 - item.rating)}
                  </span>
                  <span className="text-xs text-gray-500">{item.date}</span>
                </div>
                <p className="text-sm text-gray-300">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CHART COMPONENTS ====================
function StatCard({
  label,
  value,
  change,
  positive,
  icon,
}: {
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
      <div
        className={`text-sm flex items-center gap-1 ${positive ? "text-green-400" : "text-red-400"}`}
      >
        {positive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
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
        <div
          key={i}
          className="flex-1 h-full flex flex-col justify-end items-center gap-1"
        >
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
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#374151"
            strokeWidth="12"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="12"
            strokeDasharray="138 252"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="12"
            strokeDasharray="88 252"
            strokeDashoffset="-138"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#10B981"
            strokeWidth="12"
            strokeDasharray="26 252"
            strokeDashoffset="-226"
          />
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
  const data = [
    320, 380, 420, 350, 510, 480, 590, 620, 550, 480, 520, 610, 580, 650, 620,
    710, 680, 590, 520, 580, 640, 720, 680, 750, 710, 680, 640, 590, 620, 580,
  ];
  const max = Math.max(...data);

  return (
    <div className="h-48 flex items-end gap-0.5">
      {data.map((value, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center group relative"
        >
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
    { name: "Chrome", count: 4520, pct: 55 },
    { name: "Safari", count: 1890, pct: 23 },
    { name: "Firefox", count: 820, pct: 10 },
    { name: "Edge", count: 580, pct: 7 },
    { name: "Opera", count: 410, pct: 5 },
  ];
  const max = browsers[0].count;
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

  return (
    <div className="space-y-2">
      {browsers.map((browser, i) => (
        <div key={browser.name} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">{browser.name}</span>
              <span className="text-xs text-gray-400">
                {browser.count.toLocaleString()}{" "}
                <span className="text-gray-500">({browser.pct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-gray-700/30 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(browser.count / max) * 100}%`,
                  backgroundColor: colors[i],
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];
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
        {days.map((d) => (
          <div key={d} className="h-8 flex items-center">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1">
        <div className="flex gap-1 mb-2 text-xs text-gray-400">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center">
              {h}
            </div>
          ))}
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
  const labels = [
    "0-1m",
    "1-2m",
    "2-3m",
    "3-4m",
    "4-5m",
    "5-6m",
    "6-7m",
    "7-8m",
    "8-9m",
    "9+m",
  ];

  return (
    <div className="h-32 flex items-end gap-2">
      {bars.map((val, i) => (
        <div
          key={i}
          className="flex-1 h-full flex flex-col justify-end items-center gap-1"
        >
          <div
            className={`w-full rounded-t ${i < 5 ? "bg-green-500" : "bg-yellow-500"}`}
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
  const hours = [
    "6am",
    "8am",
    "10am",
    "12pm",
    "2pm",
    "4pm",
    "6pm",
    "8pm",
    "10pm",
  ];
  const values = [15, 35, 85, 65, 45, 55, 75, 45, 20];

  return (
    <div className="h-32 flex items-end gap-2">
      {values.map((val, i) => (
        <div
          key={i}
          className="flex-1 h-full flex flex-col justify-end items-center gap-1"
        >
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
    { path: "/", count: 4250, pct: 100 },
    { path: "/mri/validation", count: 2840, pct: 67 },
    { path: "/mri/verify", count: 2120, pct: 50 },
    { path: "/tot/validation", count: 1680, pct: 40 },
    { path: "/pin-registration", count: 1420, pct: 33 },
    { path: "/nil/validation", count: 980, pct: 23 },
  ];

  return (
    <div className="space-y-3">
      {paths.map((item, i) => (
        <div key={item.path} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm truncate max-w-[180px]"
                title={item.path}
              >
                {item.path}
              </span>
              <span className="text-xs text-gray-400">
                {item.count.toLocaleString()} ({item.pct}%)
              </span>
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
    { stage: "Sent", count: 3428, color: "#3B82F6" },
    { stage: "Delivered", count: 3256, color: "#8B5CF6" },
    { stage: "Read", count: 2992, color: "#10B981" },
    { stage: "Replied", count: 1847, color: "#F59E0B" },
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
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium">
              {item.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
        <span>
          Delivery: <span className="text-white">95%</span>
        </span>
        <span>
          Read: <span className="text-white">87%</span>
        </span>
        <span>
          Reply: <span className="text-white">54%</span>
        </span>
      </div>
    </div>
  );
}

function MockCountryTable() {
  const countries = [
    { code: "KE", name: "Kenya", count: 2840, pct: 83 },
    { code: "UG", name: "Uganda", count: 290, pct: 8 },
    { code: "TZ", name: "Tanzania", count: 180, pct: 5 },
    { code: "RW", name: "Rwanda", count: 78, pct: 2 },
    { code: "Other", name: "Other", count: 40, pct: 1 },
  ];

  return (
    <div className="space-y-2">
      {countries.map((item, i) => (
        <div
          key={item.code}
          className="flex items-center gap-3 p-2 bg-gray-700/20 rounded"
        >
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1 font-medium">{item.name}</div>
          <div className="text-sm text-gray-400">
            {item.count.toLocaleString()}{" "}
            <span className="text-gray-500">({item.pct}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockIntentBreakdown() {
  const intents = [
    { intent: "nil_filing", count: 456, confidence: 95 },
    { intent: "pin_registration", count: 312, confidence: 92 },
    { intent: "etims_query", count: 245, confidence: 88 },
    { intent: "tcc_application", count: 198, confidence: 91 },
    { intent: "payment_status", count: 156, confidence: 94 },
  ];
  const max = intents[0].count;

  return (
    <div className="space-y-2">
      {intents.map((item, i) => (
        <div key={item.intent} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{item.intent.replace(/_/g, " ")}</span>
              <span className="text-xs text-gray-400">
                {item.count}{" "}
                <span className="text-purple-400">({item.confidence}%)</span>
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
    { label: "0-100", count: 45, fast: true },
    { label: "100-200", count: 78, fast: true },
    { label: "200-500", count: 32, fast: true },
    { label: "500-1000", count: 12, fast: false },
    { label: "1000+", count: 5, fast: false },
  ];
  const max = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="h-32 flex items-end gap-2">
      {buckets.map((item) => (
        <div
          key={item.label}
          className="flex-1 flex flex-col items-center gap-1"
        >
          <div
            className={`w-full rounded-t ${item.fast ? "bg-gradient-to-t from-green-600 to-green-400" : "bg-gradient-to-t from-amber-600 to-amber-400"}`}
            style={{ height: `${(item.count / max) * 100}%` }}
          />
          <span className="text-[9px] text-gray-500">{item.label}ms</span>
        </div>
      ))}
    </div>
  );
}

// ==================== NEW TREND CHART COMPONENTS ====================

function MockSessionTrendChart() {
  const data = [
    420, 480, 520, 490, 560, 540, 610, 580, 650, 620, 680, 710, 690, 750, 720,
    780, 810, 790, 850, 820, 880, 910, 890, 950, 920, 980, 1020, 990, 1050,
    1080,
  ];
  const max = Math.max(...data);

  return (
    <div className="space-y-2">
      <div className="h-40 flex items-end gap-0.5">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 h-full flex flex-col justify-end items-center group relative"
          >
            <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
              Day {i + 1}: {value} sessions
            </div>
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-500 hover:to-blue-300 transition-colors min-h-[2px]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Jan 1</span>
        <span>Jan 15</span>
        <span>Jan 30</span>
      </div>
    </div>
  );
}

function MockConversionTrendChart() {
  const data = [
    38, 41, 39, 43, 42, 45, 44, 46, 43, 47, 45, 48, 46, 44, 47, 49, 46, 48, 50,
    47, 49, 51, 48, 50, 52, 49, 51, 53, 50, 52,
  ];
  const max = Math.max(...data);

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-0.5">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 h-full flex flex-col justify-end items-center group relative"
          >
            <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
              {value}%
            </div>
            <div
              className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t min-h-[2px]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-gray-400">Conversion Rate</span>
        </div>
      </div>
    </div>
  );
}

function MockUserGrowthChart() {
  const data = [
    { new: 120, returning: 300 },
    { new: 135, returning: 320 },
    { new: 145, returning: 310 },
    { new: 125, returning: 340 },
    { new: 150, returning: 350 },
    { new: 160, returning: 330 },
    { new: 140, returning: 360 },
    { new: 170, returning: 370 },
    { new: 155, returning: 380 },
    { new: 180, returning: 390 },
    { new: 165, returning: 400 },
    { new: 190, returning: 410 },
    { new: 175, returning: 420 },
    { new: 200, returning: 430 },
    { new: 185, returning: 440 },
  ];
  const max = Math.max(...data.map((d) => d.new + d.returning));

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-1">
        {data.map((d, i) => {
          const totalHeight = ((d.new + d.returning) / max) * 100;
          const newPortion = (d.new / (d.new + d.returning)) * 100;
          const returningPortion = (d.returning / (d.new + d.returning)) * 100;
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col justify-end group relative"
            >
              <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                New: {d.new}, Returning: {d.returning}
              </div>
              <div
                className="flex flex-col w-full"
                style={{ height: `${totalHeight}%` }}
              >
                <div
                  className="w-full bg-cyan-500 rounded-t"
                  style={{ height: `${newPortion}%` }}
                />
                <div
                  className="w-full bg-blue-500"
                  style={{ height: `${returningPortion}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <span className="text-gray-400">New</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-400">Returning</span>
        </div>
      </div>
    </div>
  );
}

function MockAiClassificationTrendChart() {
  const data = [
    { classifications: 85, errors: 3 },
    { classifications: 92, errors: 2 },
    { classifications: 88, errors: 4 },
    { classifications: 95, errors: 2 },
    { classifications: 102, errors: 3 },
    { classifications: 98, errors: 1 },
    { classifications: 110, errors: 4 },
    { classifications: 105, errors: 2 },
    { classifications: 115, errors: 3 },
    { classifications: 120, errors: 2 },
    { classifications: 118, errors: 5 },
    { classifications: 125, errors: 3 },
    { classifications: 130, errors: 2 },
    { classifications: 128, errors: 4 },
    { classifications: 135, errors: 3 },
  ];
  const max = Math.max(...data.map((d) => d.classifications));

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-1">
        {data.map((d, i) => {
          const classHeight = (d.classifications / max) * 100;
          const errorPortion =
            d.classifications > 0 ? (d.errors / d.classifications) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col justify-end group relative"
            >
              <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                {d.classifications} classifications, {d.errors} errors
              </div>
              <div
                className="flex flex-col w-full"
                style={{ height: `${classHeight}%` }}
              >
                <div
                  className="w-full bg-red-500 rounded-t"
                  style={{
                    height: `${errorPortion}%`,
                    minHeight: d.errors > 0 ? "2px" : "0",
                  }}
                />
                <div
                  className="w-full bg-purple-500 flex-1"
                  style={{ minHeight: "2px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-gray-400">Classifications</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-400">Errors</span>
        </div>
      </div>
    </div>
  );
}

function MockAiLatencyTrendChart() {
  const data = [
    { p50: 280, p95: 520 },
    { p50: 295, p95: 540 },
    { p50: 270, p95: 510 },
    { p50: 310, p95: 580 },
    { p50: 290, p95: 530 },
    { p50: 305, p95: 560 },
    { p50: 275, p95: 500 },
    { p50: 320, p95: 590 },
    { p50: 285, p95: 520 },
    { p50: 300, p95: 550 },
    { p50: 268, p95: 490 },
    { p50: 312, p95: 570 },
    { p50: 278, p95: 510 },
    { p50: 295, p95: 540 },
    { p50: 265, p95: 480 },
  ];
  const maxP95 = Math.max(...data.map((d) => d.p95));

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-1">
        {data.map((d, i) => {
          const p50Height = (d.p50 / maxP95) * 100;
          const p95Height = (d.p95 / maxP95) * 100;
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col items-center justify-end group relative"
            >
              <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                P50: {d.p50}ms, P95: {d.p95}ms
              </div>
              <div
                className="w-full relative"
                style={{ height: `${p95Height}%` }}
              >
                <div className="w-full bg-amber-300/50 rounded-t absolute inset-0" />
                <div
                  className="w-full bg-amber-500 rounded-t absolute bottom-0"
                  style={{
                    height: `${(p50Height / p95Height) * 100}%`,
                    minHeight: "2px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-gray-400">P50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-300/50" />
          <span className="text-gray-400">P95</span>
        </div>
      </div>
    </div>
  );
}

function MockAgentResolvedTrendChart() {
  const data = [
    52, 58, 55, 62, 68, 65, 72, 75, 70, 78, 82, 79, 85, 88, 84, 90, 95, 92, 98,
    102, 99, 105, 110, 107, 112, 118, 115, 120, 125, 122,
  ];
  const max = Math.max(...data);

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-0.5">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 h-full flex flex-col justify-end items-center group relative"
          >
            <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
              {value} resolved
            </div>
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t min-h-[2px]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Jan 1</span>
        <span>Jan 30</span>
      </div>
    </div>
  );
}

// ==================== SELF-SERVE CHART COMPONENTS ====================

function MockSelfServeDonutChart() {
  const selfServe = 9406;
  const assisted = 3441;
  const total = selfServe + assisted;
  const selfServePercent = (selfServe / total) * 100;
  const assistedPercent = (assisted / total) * 100;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const selfServeArc = (selfServePercent / 100) * circumference;
  const assistedArc = (assistedPercent / 100) * circumference;

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="20"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="20"
            strokeDasharray={`${selfServeArc} ${circumference}`}
            strokeDashoffset="0"
            transform="rotate(-90 80 80)"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="20"
            strokeDasharray={`${assistedArc} ${circumference}`}
            strokeDashoffset={-selfServeArc}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total.toLocaleString()}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-emerald-500" />
          <div>
            <div className="text-sm font-medium">
              Self-Serve ({selfServePercent.toFixed(1)}%)
            </div>
            <div className="text-xs text-gray-400">
              {selfServe.toLocaleString()} sessions
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-blue-500" />
          <div>
            <div className="text-sm font-medium">
              Assisted ({assistedPercent.toFixed(1)}%)
            </div>
            <div className="text-xs text-gray-400">
              {assisted.toLocaleString()} sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSelfServeTrendChart() {
  const data = [
    { selfServe: 280, assisted: 100 },
    { selfServe: 295, assisted: 105 },
    { selfServe: 310, assisted: 98 },
    { selfServe: 305, assisted: 110 },
    { selfServe: 320, assisted: 105 },
    { selfServe: 335, assisted: 115 },
    { selfServe: 340, assisted: 108 },
    { selfServe: 355, assisted: 120 },
    { selfServe: 350, assisted: 112 },
    { selfServe: 365, assisted: 125 },
    { selfServe: 380, assisted: 118 },
    { selfServe: 375, assisted: 130 },
    { selfServe: 390, assisted: 122 },
    { selfServe: 405, assisted: 135 },
    { selfServe: 400, assisted: 128 },
  ];
  const maxValue = Math.max(...data.map((d) => d.selfServe + d.assisted));

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-1">
        {data.map((d, i) => {
          const totalHeight = ((d.selfServe + d.assisted) / maxValue) * 100;
          const selfServePortion =
            (d.selfServe / (d.selfServe + d.assisted)) * 100;
          const assistedPortion =
            (d.assisted / (d.selfServe + d.assisted)) * 100;
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col justify-end group relative"
            >
              <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                Self-serve: {d.selfServe}, Assisted: {d.assisted}
              </div>
              <div
                className="flex flex-col w-full"
                style={{ height: `${totalHeight}%` }}
              >
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${assistedPortion}%` }}
                />
                <div
                  className="w-full bg-emerald-500"
                  style={{ height: `${selfServePortion}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-gray-400">Self-Serve</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-400">Assisted</span>
        </div>
      </div>
    </div>
  );
}

function MockHandoffRateTrendChart() {
  const data = [
    32, 30, 28, 31, 29, 27, 30, 28, 26, 29, 27, 25, 28, 26, 24, 27, 25, 23, 26,
    24, 22, 25, 23, 21, 24, 22, 20, 23, 21, 19,
  ];
  const max = Math.max(...data);

  return (
    <div className="space-y-2">
      <div className="h-32 flex items-end gap-0.5">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 h-full flex flex-col justify-end items-center group relative"
          >
            <div className="absolute bottom-full mb-1 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
              {value}%
            </div>
            <div
              className="w-full bg-amber-500 rounded-t min-h-[2px]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

function MockHandoffByStepChart() {
  const data = [
    { step: "payment_initiated", handoffs: 487, percentage: 32 },
    { step: "form_submission", handoffs: 312, percentage: 21 },
    { step: "otp_verification", handoffs: 245, percentage: 16 },
    { step: "account_query", handoffs: 198, percentage: 13 },
    { step: "document_upload", handoffs: 156, percentage: 10 },
    { step: "other", handoffs: 118, percentage: 8 },
  ];
  const max = data[0].handoffs;

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">
              {item.step.replace(/_/g, " ")}
            </span>
            <span className="text-gray-400">
              {item.handoffs} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700/30">
            <div
              className="h-full rounded-full bg-purple-500"
              style={{ width: `${(item.handoffs / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MockHandoffReasonsChart() {
  const data = [
    { reason: "user_request", count: 520, percentage: 34 },
    { reason: "escalation", count: 412, percentage: 27 },
    { reason: "complex_query", count: 287, percentage: 19 },
    { reason: "error_fallback", count: 198, percentage: 13 },
    { reason: "unknown", count: 99, percentage: 7 },
  ];
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${colors[i]}`} />
            <span className="text-sm font-medium capitalize">
              {item.reason.replace(/_/g, " ")}
            </span>
          </div>
          <span className="text-sm text-gray-400">
            {item.count} ({item.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function MockTopAgentsLeaderboard() {
  const data = [
    { agentId: "sarah-k", resolved: 342, avgTime: "2m 15s" },
    { agentId: "john-m", resolved: 298, avgTime: "3m 02s" },
    { agentId: "grace-n", resolved: 287, avgTime: "2m 45s" },
    { agentId: "peter-o", resolved: 256, avgTime: "4m 12s" },
    { agentId: "mary-w", resolved: 234, avgTime: "3m 28s" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="pb-2 text-left text-xs font-medium text-gray-400 uppercase">
              Rank
            </th>
            <th className="pb-2 text-left text-xs font-medium text-gray-400 uppercase">
              Agent ID
            </th>
            <th className="pb-2 text-right text-xs font-medium text-gray-400 uppercase">
              Resolved
            </th>
            <th className="pb-2 text-right text-xs font-medium text-gray-400 uppercase">
              Avg Time
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((agent, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              <td className="py-2 text-sm">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i === 0
                      ? "bg-yellow-500/20 text-yellow-500"
                      : i === 1
                        ? "bg-gray-400/20 text-gray-400"
                        : i === 2
                          ? "bg-amber-600/20 text-amber-600"
                          : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
              </td>
              <td className="py-2 text-sm font-mono">{agent.agentId}</td>
              <td className="py-2 text-right text-sm font-medium">
                {agent.resolved}
              </td>
              <td className="py-2 text-right text-sm text-gray-400">
                {agent.avgTime}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
