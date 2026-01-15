/**
 * =============================================================================
 * ANALYTICS SDK - CORE ANALYTICS CLASS
 * =============================================================================
 * 
 * The main Analytics class that provides the public API.
 * 
 * DESIGN PATTERN: Singleton
 * -------------------------
 * We export a single instance of the Analytics class so all parts
 * of an application share the same state (session, queue, etc.)
 * 
 * HOW TO USE:
 * ----------
 * 1. Initialize once: Analytics.init('your-write-key')
 * 2. Track page views: Analytics.page()
 * 3. Track events: Analytics.track('event_name', { key: 'value' })
 * 4. Identify users: Analytics.identify('user-id', { email: '...' })
 * 
 * INTERNAL FLOW:
 * -------------
 *   page()/track()/identify()
 *        ↓
 *   Create event object
 *        ↓
 *   Add to EventQueue
 *        ↓
 *   Queue flushes periodically → POST /v1/capture
 */

import { EventQueue } from './queue';
import { Storage } from './storage';
import { buildContext } from './context';

/**
 * Configuration options for the Analytics SDK.
 */
export interface AnalyticsOptions {
  /** API endpoint URL (default: /v1/capture) */
  apiEndpoint?: string;
  /** Events to batch before sending (default: 10) */
  batchSize?: number;
  /** Milliseconds between flush attempts (default: 5000) */
  flushIntervalMs?: number;
  /** Milliseconds of inactivity before new session (default: 30 minutes) */
  sessionTimeoutMs?: number;
}

/**
 * Properties for track() events.
 * Any key-value pairs relevant to the event.
 */
export interface TrackProperties {
  [key: string]: unknown;
}

/**
 * Traits for identify() calls.
 * User attributes like name, email, etc.
 */
export interface IdentifyTraits {
  name?: string;
  email?: string;
  phone?: string;
  pin?: string;
  [key: string]: unknown;
}

/**
 * Default configuration values.
 * These can be overridden when calling init().
 */
const DEFAULT_OPTIONS: Required<AnalyticsOptions> = {
  apiEndpoint: '/v1/capture',
  batchSize: 10,
  flushIntervalMs: 5000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * The Analytics class that handles all tracking.
 * 
 * This class uses composition to delegate responsibilities:
 * - EventQueue: Handles batching and sending events
 * - Storage: Handles anonymous ID, user ID, session management
 */
class AnalyticsClass {
  /** The project's write key */
  private writeKey: string | null = null;
  
  /** Merged configuration options */
  private options: Required<AnalyticsOptions> = DEFAULT_OPTIONS;
  
  /** Queue for batching events */
  private queue: EventQueue | null = null;
  
  /** Storage for identity and session */
  private storage: Storage | null = null;
  
  /** Flag to prevent double initialization */
  private isInitialized = false;

  /**
   * Initialize the Analytics SDK.
   * 
   * MUST be called before any other methods.
   * Sets up storage, queue, and event listeners.
   * 
   * @param writeKey - Your project's write key
   * @param options - Optional configuration overrides
   * 
   * @example
   * Analytics.init('pk_live_abc123', {
   *   apiEndpoint: 'https://analytics.example.com/v1/capture'
   * });
   */
  init(writeKey: string, options: AnalyticsOptions = {}): void {
    // Prevent double initialization
    if (this.isInitialized) {
      console.warn('[Analytics] Already initialized');
      return;
    }

    this.writeKey = writeKey;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Create storage manager for identity/session
    this.storage = new Storage(this.options.sessionTimeoutMs);
    
    // Create event queue for batching
    this.queue = new EventQueue(
      this.options.apiEndpoint,
      writeKey,
      this.options.batchSize,
      this.options.flushIntervalMs,
    );

    // Start automatic flushing
    this.queue.startAutoFlush();

    // Flush events when user leaves the page
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => {
        this.queue?.flush(true); // Use sendBeacon for reliability
      });
    }

    this.isInitialized = true;
    console.log('[Analytics] Initialized');
  }

  /**
   * Track a page view.
   * 
   * Call this on every navigation (or use auto-tracking with a router).
   * Page information is automatically extracted from window.location.
   * 
   * @param properties - Optional additional properties
   * 
   * @example
   * Analytics.page();
   * Analytics.page({ category: 'tax-services' });
   */
  page(properties?: TrackProperties): void {
    this.ensureInitialized();
    this.enqueue('page_view', 'page', properties);
  }

  /**
   * Track a custom event.
   * 
   * Use this to track user actions like button clicks, form submissions, etc.
   * 
   * @param eventName - Name of the event (e.g., 'button_click', 'return_filed')
   * @param properties - Event-specific data
   * 
   * @example
   * Analytics.track('button_click', { button_id: 'submit-form' });
   * Analytics.track('return_filed', { return_type: 'mri', amount: 5000 });
   */
  track(eventName: string, properties?: TrackProperties): void {
    this.ensureInitialized();
    this.enqueue(eventName, 'track', properties);
  }

  /**
   * Identify a user.
   * 
   * Call this after login or when you know who the user is.
   * Links the anonymous_id to a known user_id.
   * 
   * @param userId - Unique user identifier (PIN, email, phone, etc.)
   * @param traits - User attributes for enrichment
   * 
   * @example
   * Analytics.identify('A001234567Z', { phone: '+254700000000' });
   */
  identify(userId: string, traits?: IdentifyTraits): void {
    this.ensureInitialized();

    // Store user ID for future events
    this.storage!.setUserId(userId);

    // Send identify event
    this.enqueue('identify', 'identify', { userId, ...traits });
  }

  /**
   * Reset user identity (logout).
   * 
   * Clears the user_id and starts a new session.
   * The anonymous_id is preserved.
   * 
   * @example
   * Analytics.reset(); // On logout
   */
  reset(): void {
    this.ensureInitialized();

    this.storage!.clearUserId();
    this.storage!.resetSession();

    console.log('[Analytics] Reset complete');
  }

  /**
   * Force flush the event queue.
   * 
   * Normally events are sent automatically. Use this if you need
   * to ensure events are sent immediately (e.g., before navigation).
   * 
   * @example
   * await Analytics.flush();
   * window.location.href = '/next-page';
   */
  flush(): Promise<void> {
    this.ensureInitialized();
    return this.queue!.flush();
  }

  /**
   * Add an event to the queue.
   * 
   * PRIVATE: Called by page(), track(), identify()
   * 
   * @param eventName - Name of the event
   * @param eventType - Type: 'page', 'track', 'identify'
   * @param properties - Event properties
   */
  private enqueue(
    eventName: string,
    eventType: string,
    properties?: TrackProperties,
  ): void {
    // Build context (page info, browser info, etc.)
    const context = buildContext();

    // Create the event object
    const event = {
      event_id: this.generateId(),
      message_id: this.generateId(),
      event_name: eventName,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      anonymous_id: this.storage!.getAnonymousId(),
      user_id: this.storage!.getUserId(),
      session_id: this.storage!.getSessionId(),
      context,
      properties,
    };

    // Add to queue (will be batched and sent)
    this.queue!.push(event);
  }

  /**
   * Ensure init() has been called.
   * Throws an error if not initialized.
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('[Analytics] Not initialized. Call analytics.init() first.');
    }
  }

  /**
   * Generate a UUID for event/message IDs.
   * Uses crypto.randomUUID() with fallback for older browsers.
   */
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Singleton instance of Analytics.
 * This is what gets exported and used throughout the application.
 */
export const Analytics = new AnalyticsClass();

/**
 * Default export for convenient importing.
 * 
 * @example
 * import Analytics from '@analytics/sdk';
 */
export default Analytics;
