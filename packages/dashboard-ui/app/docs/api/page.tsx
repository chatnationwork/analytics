'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function APIDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/docs" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        REST API
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Send events from any backend, mobile app, or custom integration using HTTP requests.
      </p>

      {/* Base URL */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Base URL</h2>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono">
          https://analytics.chatnationbot.com
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Authentication</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">
            Include your Write Key in the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">X-Write-Key</code> header:
          </p>
          <CodeBlock code={`POST /v1/capture HTTP/1.1
Host: analytics.chatnationbot.com
Content-Type: application/json
X-Write-Key: your_write_key_here`} />
          <p className="mt-4 text-sm text-gray-500">
            Get your Write Key from <Link href="/settings" className="text-blue-600 hover:underline">Settings → API Keys</Link>.
          </p>
        </div>
      </section>

      {/* Capture Endpoint */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-mono px-2 py-1 rounded mr-2">POST</span>
          /v1/capture
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">Send a batch of events to the analytics collector.</p>
          
          <h3 className="font-medium mb-3">Request Body</h3>
          <CodeBlock code={`{
  "batch": [
    {
      "type": "track",
      "event": "Order Completed",
      "userId": "user_123",
      "timestamp": "2026-01-20T06:30:00.000Z",
      "properties": {
        "order_id": "ord_456",
        "total": 99.99,
        "currency": "USD"
      },
      "context": {
        "channel": "web"
      }
    }
  ]
}`} />

          <h3 className="font-medium mb-3 mt-6">Response (201 Created)</h3>
          <CodeBlock code={`{
  "status": "success"
}`} />
        </div>
      </section>

      {/* Event Types */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Event Types</h2>
        
        {/* Track */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">track</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Track a user action or event.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "Button Clicked",
  "userId": "user_123",
  "anonymousId": "anon_456",
  "timestamp": "2026-01-20T06:30:00.000Z",
  "properties": {
    "button_id": "signup",
    "color": "blue"
  }
}`} />
        </div>

        {/* Page */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">page</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Track a page view.</p>
          <CodeBlock code={`{
  "type": "page",
  "name": "Home",
  "userId": "user_123",
  "timestamp": "2026-01-20T06:30:00.000Z",
  "context": {
    "page": {
      "path": "/",
      "url": "https://example.com/",
      "title": "Home | My App"
    }
  }
}`} />
        </div>

        {/* Identify */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-mono text-lg font-medium mb-2">identify</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Link an anonymous user to a known user ID.</p>
          <CodeBlock code={`{
  "type": "identify",
  "userId": "user_123",
  "anonymousId": "anon_456",
  "timestamp": "2026-01-20T06:30:00.000Z",
  "traits": {
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "premium"
  }
}`} />
        </div>
      </section>

      {/* Field Reference */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Field Reference</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3">Field</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Required</th>
                <th className="text-left p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="p-3 font-mono">type</td>
                <td className="p-3">string</td>
                <td className="p-3">Yes</td>
                <td className="p-3">track, page, or identify</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">event</td>
                <td className="p-3">string</td>
                <td className="p-3">For track</td>
                <td className="p-3">Event name</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">userId</td>
                <td className="p-3">string</td>
                <td className="p-3">*</td>
                <td className="p-3">Known user ID (userId or anonymousId required)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">anonymousId</td>
                <td className="p-3">string</td>
                <td className="p-3">*</td>
                <td className="p-3">Anonymous device/session ID</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">timestamp</td>
                <td className="p-3">ISO 8601</td>
                <td className="p-3">No</td>
                <td className="p-3">When event occurred (defaults to now)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">properties</td>
                <td className="p-3">object</td>
                <td className="p-3">No</td>
                <td className="p-3">Custom event data</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">context</td>
                <td className="p-3">object</td>
                <td className="p-3">No</td>
                <td className="p-3">Page, device, channel info</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Code Examples</h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium mb-3">cURL</h3>
            <CodeBlock code={`curl -X POST https://analytics.chatnationbot.com/v1/capture \\
  -H "Content-Type: application/json" \\
  -H "X-Write-Key: your_write_key" \\
  -d '{
    "batch": [{
      "type": "track",
      "event": "Order Completed",
      "userId": "user_123",
      "properties": { "total": 99.99 }
    }]
  }'`} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium mb-3">Python</h3>
            <CodeBlock code={`import requests

url = "https://analytics.chatnationbot.com/v1/capture"
headers = {
    "Content-Type": "application/json",
    "X-Write-Key": "your_write_key"
}

payload = {
    "batch": [{
        "type": "track",
        "event": "Order Completed",
        "userId": "user_123",
        "properties": {"total": 99.99}
    }]
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code)`} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium mb-3">Node.js</h3>
            <CodeBlock code={`const response = await fetch(
  "https://analytics.chatnationbot.com/v1/capture",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Write-Key": "your_write_key"
    },
    body: JSON.stringify({
      batch: [{
        type: "track",
        event: "Order Completed",
        userId: "user_123",
        properties: { total: 99.99 }
      }]
    })
  }
);`} />
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Error Codes</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr><td className="p-3 font-mono">200, 201</td><td className="p-3">Success</td></tr>
              <tr><td className="p-3 font-mono">400</td><td className="p-3">Invalid request body</td></tr>
              <tr><td className="p-3 font-mono">401</td><td className="p-3">Missing or invalid Write Key</td></tr>
              <tr><td className="p-3 font-mono">429</td><td className="p-3">Rate limit exceeded</td></tr>
              <tr><td className="p-3 font-mono">500</td><td className="p-3">Server error (retry)</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
