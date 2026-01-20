'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Book, Code, Key, Zap, Globe, Webhook, Menu, X } from 'lucide-react';

const navigation = [
  { name: 'Getting Started', href: '/docs', icon: Book },
  { name: 'Quick Start', href: '/docs/quickstart', icon: Zap },
  { name: 'JavaScript SDK', href: '/docs/sdk', icon: Code },
  { name: 'REST API', href: '/docs/api', icon: Globe },
  { name: 'WhatsApp Integration', href: '/docs/whatsapp', icon: Webhook },
];

export default function DocsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Analytics Documentation
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Everything you need to integrate analytics into your applications.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <QuickLink
          href="/docs/quickstart"
          title="Quick Start"
          description="Get up and running in 5 minutes"
          icon={<Zap className="h-6 w-6" />}
        />
        <QuickLink
          href="/docs/sdk"
          title="JavaScript SDK"
          description="Track events from web applications"
          icon={<Code className="h-6 w-6" />}
        />
        <QuickLink
          href="/docs/api"
          title="REST API"
          description="Send events from any backend"
          icon={<Globe className="h-6 w-6" />}
        />
        <QuickLink
          href="/docs/whatsapp"
          title="WhatsApp Integration"
          description="Track messaging events"
          icon={<Webhook className="h-6 w-6" />}
        />
        <QuickLink
          href="/settings"
          title="Get API Key"
          description="Generate your Write Key"
          icon={<Key className="h-6 w-6" />}
        />
      </div>

      {/* Getting Started */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Getting Started
        </h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium mb-4">1. Get Your API Key</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Go to <Link href="/settings" className="text-blue-600 hover:underline">Settings → API Keys</Link> and 
            generate a new Write Key. You'll need this to authenticate your requests.
          </p>

          <h3 className="text-lg font-medium mb-4 mt-8">2. Choose Your Integration Method</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">JavaScript SDK</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Best for web applications. Automatic page views, sessions, and identity.
              </p>
              <Link href="/docs/sdk" className="text-blue-600 text-sm hover:underline">
                View SDK Docs →
              </Link>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">REST API</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Best for backends, mobile apps, or any custom integration.
              </p>
              <Link href="/docs/api" className="text-blue-600 text-sm hover:underline">
                View API Docs →
              </Link>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4 mt-8">3. Start Sending Events</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Once integrated, events will appear in your dashboard within seconds.
          </p>
        </div>
      </section>

      {/* Endpoint Info */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          API Endpoints
        </h2>
        
        <div className="bg-gray-900 text-gray-100 rounded-lg p-6 font-mono text-sm overflow-x-auto">
          <div className="mb-4">
            <span className="text-green-400">Collector API:</span>{' '}
            <span className="text-yellow-400">https://analytics.chatnationbot.com/v1/capture</span>
          </div>
          <div>
            <span className="text-green-400">Dashboard API:</span>{' '}
            <span className="text-yellow-400">https://analytics.chatnationbot.com/api/dashboard</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, title, description, icon }: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link 
      href={href}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
