# Analytics Integration Guide

This guide explains how to integrate the analytics service into your frontend application using the provided **Analytics SDK**.

## 1. Using the SDK (React/Next.js/Node)

If you are working within this monorepo (e.g., `packages/dashboard-ui`), you can import the SDK directly.

### Installation

The SDK is available as `@analytics/sdk` in the workspace.

```bash
npm install @analytics/sdk
# or just ensure it's in your dependencies if using workspaces
```

### Initializing (e.g., in `_app.tsx` or `layout.tsx`)

Initialize the SDK once at the root of your application.

```typescript
import Analytics from '@analytics/sdk';
import { useEffect } from 'react';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 1. Initialize with your Project Write Key
    Analytics.init('YOUR_WRITE_KEY', {
      // Optional: Override endpoint for local development
      apiEndpoint: 'http://localhost:3000/v1/capture', 
      debug: true // Log events to console
    });

    // 2. Track initial page view
    Analytics.page();
  }, []);

  return <Component {...pageProps} />;
}
```

### Tracking Page Views (Next.js Router)

To track navigation changes in a Single Page App (SPA):

```typescript
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Analytics from '@analytics/sdk';

export function usePageTracking() {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      Analytics.page({
        path: url,
        title: document.title
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
}
```

### Tracking Custom Events

Use `Analytics.track()` for user interactions like button clicks or form submissions.

```typescript
import Analytics from '@analytics/sdk';

function SignUpButton() {
  const handleClick = () => {
    // Track the click
    Analytics.track('signup_button_clicked', {
      location: 'header',
      style: 'blue'
    });
    
    // Proceed with logic...
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Identifying Users

When a user logs in, call `identify` to link their anonymous session to their user ID.

```typescript
function onLoginSuccess(user) {
  Analytics.identify(user.id, {
    email: user.email,
    name: user.name,
    plan: 'pro'
  });
}
```

---

## 2. Using the Snippet (External HTML Sites)

For external websites (WordPress, Shopify, plain HTML), use the JavaScript snippet. This loads the SDK asynchronously.

**Paste this into the `<head>` of your website:**

```html
<script>
  !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Analytics snippet included twice.");else{analytics.invoked=!0;analytics.methods=["init","page","track","identify","reset","flush"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src="http://localhost:3000/sdk.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a),analytics.init(t,e)};
  
  // INIT CONFIGURATION
  // Replace with your Write Key and API URL
  analytics.load("YOUR_WRITE_KEY", {
    apiEndpoint: "http://localhost:3000/v1/capture"
  });

  // Track initial page view
  analytics.page();
  }}();
</script>
```

*(Note: Ensure `sdk.js` is hosted and accessible. In development, you might need to build the SDK and serve the `dist` folder).*

---

## 3. Core API Reference

### `Analytics.init(writeKey, options?)`
- `writeKey` (string): The project's unique identifier.
- `options`:
  - `apiEndpoint` (string): URL of the collector (default: cloud URL).
  - `debug` (boolean): Check console for logs.

### `Analytics.page(name?, properties?)`
Tracks a page view.
- `name` (string): Optional page name.
- `properties` (object): { path, referrer, title... }

### `Analytics.track(eventName, properties?)`
Tracks a user action.
- `eventName` (string): "Button Clicked", "Order Placed".
- `properties` (object): Event attributes.

### `Analytics.identify(userId, traits?)`
Identifies a user.
- `userId` (string): Unique database ID.
- `traits` (object): { email, name, age... }

### `Analytics.reset()`
Clears the session and user identity (e.g., on logout).
