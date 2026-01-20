'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function SDKDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/docs" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Docs
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        JavaScript SDK
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Track events from web applications with automatic page views, sessions, and identity management.
      </p>

      {/* Installation */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Installation</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">Add this snippet to your <code>&lt;head&gt;</code> tag:</p>
          <CodeBlock code={`<script>
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

analytics.load("YOUR_WRITE_KEY", {
  apiEndpoint: "https://analytics.chatnationbot.com/v1/capture"
});
analytics.page();
}}();
</script>`} />
        </div>
      </section>

      {/* API Reference */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">API Reference</h2>
        
        {/* init */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">analytics.init(writeKey, options)</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Initialize the SDK with your Write Key.</p>
          <CodeBlock code={`analytics.init("wk_abc123", {
  apiEndpoint: "https://analytics.chatnationbot.com/v1/capture"
});`} />
          <div className="mt-4">
            <h4 className="font-medium mb-2">Options</h4>
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="pb-2">Option</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr>
                  <td className="py-2 font-mono">apiEndpoint</td>
                  <td className="py-2">string</td>
                  <td className="py-2">Collector API URL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* page */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">analytics.page(name?, properties?)</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Track a page view. Call this on every page/route change.</p>
          <CodeBlock code={`// Basic page view (auto-detects page info)
analytics.page();

// Named page view
analytics.page("Home");

// With properties
analytics.page("Product", {
  product_id: "p_123",
  category: "Electronics"
});`} />
        </div>

        {/* track */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">analytics.track(eventName, properties?)</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Track a custom event with optional properties.</p>
          <CodeBlock code={`// Simple event
analytics.track("Button Clicked");

// With properties
analytics.track("Purchase Completed", {
  order_id: "ord_123",
  total: 99.99,
  currency: "USD",
  items: 3
});`} />
        </div>

        {/* identify */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-mono text-lg font-medium mb-2">analytics.identify(userId, traits?)</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Link the current anonymous user to a known user ID.</p>
          <CodeBlock code={`// After user logs in
analytics.identify("user_123", {
  email: "john@example.com",
  name: "John Doe",
  plan: "premium",
  createdAt: "2024-01-15"
});`} />
        </div>

        {/* reset */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-mono text-lg font-medium mb-2">analytics.reset()</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Clear user identity. Call this when a user logs out.</p>
          <CodeBlock code={`// On logout
analytics.reset();`} />
        </div>
      </section>

      {/* React/Next.js */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">React / Next.js Integration</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="mb-4">For Next.js App Router, add to your <code>app/layout.tsx</code>:</p>
          <CodeBlock code={`import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script id="analytics" strategy="afterInteractive">
          {\`
            // Paste the analytics snippet here
          \`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}`} />
        </div>
      </section>

      {/* Common Events */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Common Event Examples</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <CodeBlock code={`// E-commerce
analytics.track("Product Viewed", { product_id: "p_123", price: 29.99 });
analytics.track("Added to Cart", { product_id: "p_123", quantity: 1 });
analytics.track("Checkout Started", { cart_total: 59.98 });
analytics.track("Order Completed", { order_id: "ord_456", total: 59.98 });

// SaaS
analytics.track("Signed Up", { plan: "free" });
analytics.track("Feature Used", { feature: "export" });
analytics.track("Plan Upgraded", { from: "free", to: "pro" });

// Content
analytics.track("Article Read", { article_id: "a_789", read_time: 120 });
analytics.track("Video Played", { video_id: "v_456", duration: 300 });`} />
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
