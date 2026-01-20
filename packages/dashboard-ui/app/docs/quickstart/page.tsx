'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function QuickStartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/docs" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Quick Start Guide
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Get analytics working in your app in under 5 minutes.
      </p>

      {/* Step 1 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3">1</span>
          Get Your API Key
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">
            Go to <Link href="/settings" className="text-blue-600 hover:underline font-medium">Settings → API Keys</Link> and 
            click <strong>"Generate New Key"</strong>.
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li>Give it a name (e.g., "Production", "Staging")</li>
            <li>Select <strong>Write</strong> type for sending events</li>
            <li>Copy the key - you'll only see it once!</li>
          </ul>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3">2</span>
          Add the SDK to Your App
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">Add this script to your HTML <code>&lt;head&gt;</code> or React layout:</p>
          <CodeBlock language="html" code={`<script>
!function(){var analytics=window.analytics=window.analytics||[];
if(!analytics.initialize)if(analytics.invoked)
window.console&&console.error("Analytics snippet included twice.");
else{analytics.invoked=!0;
analytics.methods=["init","page","track","identify","reset"];
analytics.factory=function(t){return function(){
var e=Array.prototype.slice.call(arguments);
e.unshift(t);analytics.push(e);return analytics}};
for(var t=0;t<analytics.methods.length;t++){
var e=analytics.methods[t];analytics[e]=analytics.factory(e)}
analytics.load=function(t,e){
var n=document.createElement("script");
n.type="text/javascript";n.async=!0;
n.src="https://analytics.chatnationbot.com/sdk.js";
var a=document.getElementsByTagName("script")[0];
a.parentNode.insertBefore(n,a);
analytics.init(t,e)};

// Initialize with your Write Key
analytics.load("YOUR_WRITE_KEY_HERE", {
  apiEndpoint: "https://analytics.chatnationbot.com/v1/capture"
});

// Track the initial page view
analytics.page();
}}();
</script>`} />
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3">3</span>
          Track Events
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">Now you can track events anywhere in your app:</p>
          <CodeBlock language="javascript" code={`// Track a button click
analytics.track('Button Clicked', {
  button_id: 'signup',
  location: 'hero'
});

// Track a form submission
analytics.track('Form Submitted', {
  form_name: 'contact',
  email: 'user@example.com'
});

// Identify a logged-in user
analytics.identify('user_123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium'
});`} />
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3">4</span>
          View in Dashboard
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">
            Events appear in your dashboard almost instantly. Go to:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li><Link href="/overview" className="text-blue-600 hover:underline">Overview</Link> - See total sessions and users</li>
            <li><Link href="/events" className="text-blue-600 hover:underline">Events</Link> - Browse individual events</li>
            <li><Link href="/sessions" className="text-blue-600 hover:underline">Sessions</Link> - See complete user journeys</li>
            <li><Link href="/funnel" className="text-blue-600 hover:underline">Funnel</Link> - Build conversion funnels</li>
          </ul>
        </div>
      </section>

      {/* Next Steps */}
      <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/docs/sdk" className="text-blue-600 hover:underline">
            → Full SDK Reference
          </Link>
          <Link href="/docs/api" className="text-blue-600 hover:underline">
            → REST API for Backends
          </Link>
          <Link href="/docs/whatsapp" className="text-blue-600 hover:underline">
            → WhatsApp Integration
          </Link>
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
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
