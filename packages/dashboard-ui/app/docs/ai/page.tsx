'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AIDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/docs" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        AI Agent Integration
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Track AI model performance, intent classification, and errors from your LLM-powered agents.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Overview</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">
            AI analytics events allow you to track how your AI/LLM components are performing. These events integrate with WhatsApp analytics to show the complete user journey.
          </p>
          <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li><strong>ai.classification</strong> - When your AI classifies user intent</li>
            <li><strong>ai.generation</strong> - When your AI generates a response</li>
            <li><strong>ai.error</strong> - When the AI fails or times out</li>
          </ul>
        </div>
      </section>

      {/* ai.classification */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <code className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">ai.classification</code>
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Fired when your AI classifies user intent.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "ai.classification",
  "userId": "+254712345678",
  "properties": {
    "input_text": "I want to file nil returns",
    "detected_intent": "nil_filing",
    "confidence": 0.99,
    "latency_ms": 450,
    "prompt_tokens": 120,
    "completion_tokens": 15,
    "model": "llama3.2:3b"
  },
  "context": {
    "channel": "whatsapp"
  }
}`} />
          <h3 className="font-medium mt-6 mb-3">Properties</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2">Property</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-400">
              <tr className="border-b dark:border-gray-700">
                <td className="py-2"><code>detected_intent</code></td>
                <td>string</td>
                <td>The classified intent (e.g., "nil_filing", "pin_registration")</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2"><code>confidence</code></td>
                <td>float</td>
                <td>Confidence score 0-1</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2"><code>latency_ms</code></td>
                <td>int</td>
                <td>Time taken for inference in milliseconds</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2"><code>model</code></td>
                <td>string</td>
                <td>Model identifier (e.g., "llama3.2:3b")</td>
              </tr>
              <tr>
                <td className="py-2"><code>prompt_tokens</code></td>
                <td>int</td>
                <td>Input tokens used (for cost tracking)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ai.generation */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">ai.generation</code>
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Fired when your AI generates a text response.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "ai.generation",
  "userId": "+254712345678",
  "properties": {
    "prompt_type": "clarification",
    "output_length": 45,
    "latency_ms": 800,
    "model": "llama3.2:3b"
  }
}`} />
        </div>
      </section>

      {/* ai.error */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <code className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">ai.error</code>
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Fired when the AI encounters an error.</p>
          <CodeBlock code={`{
  "type": "track",
  "event": "ai.error",
  "userId": "+254712345678",
  "properties": {
    "error_type": "json_parse_error",
    "recovery_attempt": 1,
    "recovered": false,
    "fallback_action": "agent_handoff"
  }
}`} />
          <h3 className="font-medium mt-6 mb-3">Error Types</h3>
          <ul className="list-disc ml-6 space-y-1 text-gray-600 dark:text-gray-400">
            <li><code>timeout</code> - Model took too long to respond</li>
            <li><code>json_parse_error</code> - Output wasn't valid JSON</li>
            <li><code>network</code> - Network error reaching model</li>
            <li><code>context_length</code> - Input exceeded model context</li>
          </ul>
        </div>
      </section>

      {/* Dashboard Metrics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Dashboard Metrics</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">Once you send AI events, you'll see these metrics in the WhatsApp Analytics dashboard:</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2">Metric</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-400">
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">AI Classifications</td>
                <td>Total number of intent classifications</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">AI Accuracy</td>
                <td>Average confidence score across classifications</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">Avg Latency</td>
                <td>Average inference time in milliseconds</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">Error Rate</td>
                <td>Percentage of AI requests that failed</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">Top Intents</td>
                <td>Most common user intents detected</td>
              </tr>
              <tr>
                <td className="py-2">Latency Distribution</td>
                <td>Histogram of inference times</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
      <code>{code}</code>
    </pre>
  );
}
