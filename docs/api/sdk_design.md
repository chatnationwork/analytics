# Client SDK Design

This document describes the architecture of the JavaScript client library (`analytics.js`) that will run on the Tax App.

## 1. Core Responsibilities
1.  **Queue**: A memory-safe queue to hold events before sending.
2.  **Dispatcher**: An async loop that flushes the queue to the API.
3.  **Storage Engine**: A wrapper around `localStorage` / `cookie` for persistence.
4.  **Context Manager**: Automatically gather browser info (URL, User Agent, Screen).

## 2. API Design (Global Object)
The SDK will expose a global function/object `window.analytics`.

```javascript
// Initialize
analytics.init('WRITE_KEY', { options });

// Track Page
analytics.page();

// Track Event
analytics.track('Evaluation Started', { obligation: 'mri' });

// Identify User
analytics.identify('USER_ID', { name: 'John Doe', email: '...' });

// Reset (Logout)
analytics.reset(); 
```

## 3. Implementation Details

### Asynchronous Loading
To avoid blocking the UI, the SDK should be loaded asynchronously.
The strict pattern:
1.  Define a stub `window.analytics = []` that captures calls.
2.  Load the script.
3.  Script loads, replaces `window.analytics` with real object, and replays the queue.

### Batching Logic
*   **Trigger**: Flush when:
    *   Queue size >= 10 events.
    *   OR Time since last flush >= 5 seconds.
    *   OR `pagehide` / `beforeunload` event fires (try `navigator.sendBeacon` for reliability on exit).

### Identification & Session logic
*   **Lazy Initialization**: Check `localStorage` for `anonymous_id`. If missing, generate UUIDv4.
*   **Session Timer**: On every `track` call, check timestamp of last activity. If > 30 mins, generate new `session_id`.

## 4. Next.js Integration (Proposed)
Create a wrapper component `<AnalyticsProvider />` to handle the initialization and route tracking.

```tsx
// components/AnalyticsProvider.tsx
'use client';

useEffect(() => {
  // 1. Load Script
  // 2. Initialize
}, []);

const pathname = usePathname();
const searchParams = useSearchParams();

useEffect(() => {
  // Track Page View on route change
  analytics.page();
}, [pathname, searchParams]);
```
