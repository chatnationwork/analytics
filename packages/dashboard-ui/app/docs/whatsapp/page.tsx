'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function WhatsAppDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/docs" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        WhatsApp Integration
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Track WhatsApp messaging events to analyze conversations, response times, and engagement.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How It Works</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">
            Send events to our collector whenever something happens in your WhatsApp system:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li>Message received from user</li>
            <li>Message sent to user</li>
            <li>Message delivered/read</li>
            <li>Contact created</li>
            <li>Chat assigned to agent</li>
          </ul>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm">
              <strong>Endpoint:</strong>{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                POST https://analytics.chatnationbot.com/v1/capture
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Authentication</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            You must include your <strong>Write Key</strong> in the request header to authenticate your events.
            This ensures the data is assigned to the correct project.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
            X-Write-Key: your_write_key_here
          </div>
          <p className="mt-4 text-sm text-gray-500">
            You can find your Write Key in the <Link href="/settings/api-keys" className="text-blue-500 hover:underline">API Keys</Link> section.
          </p>
        </div>
      </section>

      {/* Base Payload */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Base Payload Structure</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <CodeBlock code={`{
  "batch": [
    {
      "type": "track",
      "event": "event_name",
      "userId": "+254712345678",
      "timestamp": "2026-01-20T06:30:00.000Z",
      "context": {
        "channel": "whatsapp",
        "library": {
          "name": "crm-whatsapp",
          "version": "1.0.0"
        }
      },
      "properties": {
        // Event-specific data
      }
    }
  ]
}`} />
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Key:</strong> The <code>userId</code> should be the WhatsApp phone number (e.g., "+254712345678").
              The <code>context.channel</code> must be <code>"whatsapp"</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Event Types */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Event Types</h2>
        
        {/* message.received */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">message.received</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">User sends a message to your WhatsApp number.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "message.received",
  "userId": "+254712345678",
  "timestamp": "2026-01-20T06:30:00.000Z",
  "context": { "channel": "whatsapp" },
  "properties": {
    "messageId": "wamid.xxx",
    "chatId": "chat_123",
    "direction": "inbound",
    "contentType": "text",
    "hasMedia": false
  }
}`} />
        </div>

        {/* message.sent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">message.sent</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You send a message to a user.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "message.sent",
  "userId": "+254712345678",
  "timestamp": "2026-01-20T06:31:00.000Z",
  "context": { "channel": "whatsapp" },
  "properties": {
    "messageId": "wamid.yyy",
    "chatId": "chat_123",
    "direction": "outbound",
    "contentType": "template",
    "templateId": "welcome_v2",
    "agentId": "agent_456"
  }
}`} />
        </div>

        {/* message.read */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">message.read</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">User reads your message.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "message.read",
  "userId": "+254712345678",
  "timestamp": "2026-01-20T06:32:00.000Z",
  "context": { "channel": "whatsapp" },
  "properties": {
    "messageId": "wamid.yyy",
    "readAt": "2026-01-20T06:32:00.000Z"
  }
}`} />
        </div>

        {/* contact.created */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">contact.created</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">New contact added to CRM.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "contact.created",
  "userId": "+254712345678",
  "timestamp": "2026-01-20T06:30:00.000Z",
  "context": { "channel": "whatsapp" },
  "properties": {
    "chatId": "chat_123",
    "name": "John Doe",
    "source": "organic",
    "countryCode": "KE"
  }
}`} />
        </div>

        {/* chat.resolved */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-mono text-lg font-medium mb-2">chat.resolved</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Conversation is marked as resolved.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "chat.resolved",
  "userId": "+254712345678",
  "timestamp": "2026-01-20T08:30:00.000Z",
  "context": { "channel": "whatsapp" },
  "properties": {
    "chatId": "chat_123",
    "agentId": "agent_456",
    "resolutionType": "resolved",
    "messageCount": 12,
    "durationMinutes": 120
  }
}`} />
        </div>
      </section>

      {/* Metrics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Metrics You Can Track</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3">Metric</th>
                <th className="text-left p-3">How It's Calculated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="p-3 font-medium">Response Time</td>
                <td className="p-3">Time between message.received and next message.sent</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Daily New Contacts</td>
                <td className="p-3">Count of contact.created per day</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Read Rate</td>
                <td className="p-3">message.read / message.sent</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Peak Hours</td>
                <td className="p-3">message.received grouped by hour</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Agent Performance</td>
                <td className="p-3">Events grouped by agentId</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Example Flow */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Example: Full Conversation</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <CodeBlock code={`// 1. User sends first message (new contact)
POST /v1/capture
{ "batch": [
  { "event": "contact.created", "userId": "+254712345678", ... },
  { "event": "message.received", "userId": "+254712345678", ... }
]}

// 2. Agent is assigned
POST /v1/capture
{ "batch": [{ "event": "chat.assigned", "userId": "+254712345678", ... }]}

// 3. Agent replies
POST /v1/capture
{ "batch": [{ "event": "message.sent", "userId": "+254712345678", ... }]}

// 4. User reads and replies
POST /v1/capture
{ "batch": [
  { "event": "message.read", "userId": "+254712345678", ... },
  { "event": "message.received", "userId": "+254712345678", ... }
]}

// 5. Chat resolved
POST /v1/capture
{ "batch": [{ "event": "chat.resolved", "userId": "+254712345678", ... }]}`} />
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
