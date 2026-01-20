'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, Zap, Eye, Users, MessageCircle, BarChart3, Target, Clock, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <nav className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <span className="font-semibold text-xl">Analytics</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/showcase" className="text-gray-300 hover:text-white transition-colors">
              Preview
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm mb-8 border border-white/10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Now tracking Web + WhatsApp in one place
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Your Data Has<br />a Story to Tell
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
            Stop guessing. See exactly how users move through your app, 
            where they drop off, and why your WhatsApp campaigns work (or don't).
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link 
              href="/signup" 
              className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all text-lg font-medium flex items-center gap-2"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/showcase" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-lg font-medium"
            >
              See It In Action
            </Link>
          </div>
        </div>
      </header>

      {/* The Problem */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Problem We Solve</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              You're collecting data everywhere, but can you answer these questions?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <QuestionCard 
              question="Why did 60% of users abandon checkout?"
              before="Checking logs, talking to support, guessing"
              after="See exact drop-off point in the funnel"
            />
            <QuestionCard 
              question="Is WhatsApp actually driving sales?"
              before="Campaign reports with no conversion data"
              after="Track message → click → purchase journey"
            />
            <QuestionCard 
              question="Who is this user and what did they do?"
              before="Searching 5 different tools"
              after="One timeline, complete story"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-400">Three steps to clarity</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              icon={<Zap className="w-6 h-6" />}
              title="Add One Snippet"
              description="Drop our SDK into your website or connect WhatsApp webhooks. Takes 5 minutes."
            />
            <StepCard 
              number="2"
              icon={<Eye className="w-6 h-6" />}
              title="We Capture Everything"
              description="Page views, clicks, form submissions, WhatsApp messages, campaigns—automatically."
            />
            <StepCard 
              number="3"
              icon={<BarChart3 className="w-6 h-6" />}
              title="Get the Full Picture"
              description="See funnels, user journeys, peak hours, and exactly where things break."
            />
          </div>
        </div>
      </section>

      {/* Web + WhatsApp Unified */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full text-green-400 text-sm mb-6">
                <MessageCircle className="w-4 h-4" />
                Cross-Channel Intelligence
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Web + WhatsApp.<br />One Dashboard.
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Your customers don't care about your channels. They start on WhatsApp, 
                continue on your website, and finish on mobile. We track the whole journey.
              </p>
              <ul className="space-y-4">
                <FeatureItem text="See which WhatsApp campaigns drive website traffic" />
                <FeatureItem text="Track response times and agent performance" />
                <FeatureItem text="Know when users are most active (peak hours)" />
                <FeatureItem text="Follow one user across every touchpoint" />
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-2xl border border-white/10 p-6">
              <JourneyVisualization />
            </div>
          </div>
        </div>
      </section>

      {/* What You'll See */}
      <section className="py-24 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What You'll See</h2>
            <p className="text-xl text-gray-400">
              Real insights, not just numbers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InsightCard 
              icon={<Target className="w-6 h-6" />}
              title="Conversion Funnels"
              description="See exactly where users drop off"
            />
            <InsightCard 
              icon={<Users className="w-6 h-6" />}
              title="User Journeys"
              description="Complete timeline for any user"
            />
            <InsightCard 
              icon={<Clock className="w-6 h-6" />}
              title="Peak Hours"
              description="Know when to send campaigns"
            />
            <InsightCard 
              icon={<Globe className="w-6 h-6" />}
              title="Geographic Insights"
              description="Where your users come from"
            />
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/showcase" 
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              See all visualizations 
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Hear Your Data's Story?
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Set up in 5 minutes. See insights in real-time. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link 
              href="/signup" 
              className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all text-lg font-medium flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/docs" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-lg font-medium"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              A
            </div>
            <span>Analytics by ChatNation</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="/docs/api" className="hover:text-white transition-colors">API</Link>
            <Link href="/docs/sdk" className="hover:text-white transition-colors">SDK</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuestionCard({ question, before, after }: { question: string; before: string; after: string }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl border border-white/10 p-6 hover:border-blue-500/50 transition-colors">
      <p className="text-lg font-medium mb-4">"{question}"</p>
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-red-400 mt-0.5">✗</span>
          <span className="text-gray-400">{before}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400 mt-0.5">✓</span>
          <span className="text-gray-300">{after}</span>
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-green-400" />
      </div>
      <span className="text-gray-300">{text}</span>
    </li>
  );
}

function InsightCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-white/5 p-6 hover:bg-gray-800/50 transition-colors">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function JourneyVisualization() {
  const events = [
    { time: '10:00 AM', icon: '📱', label: 'WhatsApp message received', channel: 'whatsapp' },
    { time: '10:02 AM', icon: '🔗', label: 'Clicked campaign link', channel: 'whatsapp' },
    { time: '10:03 AM', icon: '🌐', label: 'Landed on website', channel: 'web' },
    { time: '10:05 AM', icon: '🛒', label: 'Added to cart', channel: 'web' },
    { time: '10:08 AM', icon: '💳', label: 'Completed purchase', channel: 'web' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">User Journey: +254712345678</div>
      {events.map((event, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            event.channel === 'whatsapp' ? 'bg-green-500/20' : 'bg-blue-500/20'
          }`}>
            {event.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-400">{event.time}</div>
            <div className="font-medium">{event.label}</div>
          </div>
          <div className={`text-xs px-2 py-1 rounded ${
            event.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {event.channel}
          </div>
        </div>
      ))}
    </div>
  );
}
