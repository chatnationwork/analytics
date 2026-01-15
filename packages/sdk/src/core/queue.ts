/**
 * =============================================================================
 * EVENT QUEUE
 * =============================================================================
 * 
 * Batches and sends analytics events to the server.
 * 
 * WHY BATCH EVENTS?
 * ----------------
 * Sending each event individually would:
 * - Create many HTTP requests (slow, battery drain)
 * - Increase server load
 * - Increase likelihood of rate limiting
 * 
 * Batching combines multiple events into a single request:
 * - More efficient network usage
 * - Fewer round trips
 * - Better performance
 * 
 * OFFLINE SUPPORT:
 * ---------------
 * If sending fails (network error), events are saved to localStorage.
 * When the SDK loads next time, it recovers and resends them.
 * 
 * SENDBEACON:
 * ----------
 * When the page unloads, normal fetch() requests may be cancelled.
 * navigator.sendBeacon() is designed for this - it guarantees delivery
 * even as the page is closing.
 */

/**
 * Shape of an event in the queue.
 */
interface AnalyticsEvent {
  event_id: string;
  message_id: string;
  event_name: string;
  event_type: string;
  timestamp: string;
  anonymous_id: string;
  user_id?: string;
  session_id: string;
  context: object;
  properties?: object;
}

/**
 * Manages the event queue with batching and automatic flushing.
 */
export class EventQueue {
  /** Array of events waiting to be sent */
  private queue: AnalyticsEvent[] = [];
  
  /** Timer for automatic flushing */
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  
  /** Prevent concurrent flush operations */
  private isFlushing = false;

  /**
   * Create a new EventQueue.
   * 
   * @param apiEndpoint - URL to send events to
   * @param writeKey - Project write key for authentication
   * @param batchSize - Flush when queue reaches this size
   * @param flushIntervalMs - Flush every N milliseconds
   */
  constructor(
    private apiEndpoint: string,
    private writeKey: string,
    private batchSize: number,
    private flushIntervalMs: number,
  ) {}

  /**
   * Add an event to the queue.
   * 
   * If the queue reaches batchSize, triggers an immediate flush.
   * Also tries to recover any events stored from previous sessions.
   * 
   * @param event - The event to queue
   */
  push(event: AnalyticsEvent): void {
    this.queue.push(event);

    // Try to recover events from localStorage (first push only)
    this.recoverFromStorage();

    // Flush if we've reached the batch size
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Start automatic flushing on an interval.
   * 
   * Sends queued events every flushIntervalMs (default: 5 seconds).
   */
  startAutoFlush(): void {
    // Only one timer at a time
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Stop automatic flushing.
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Send all queued events to the server.
   * 
   * @param useBeacon - Use sendBeacon API (for page unload)
   */
  async flush(useBeacon = false): Promise<void> {
    // Nothing to send
    if (this.queue.length === 0) return;
    
    // Prevent concurrent flushes
    if (this.isFlushing) return;

    this.isFlushing = true;
    
    // Take all events from queue
    const batch = [...this.queue];
    this.queue = [];

    // Build the payload
    const payload = {
      batch,
      sent_at: new Date().toISOString(),
      write_key: this.writeKey,
    };

    try {
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        /**
         * SENDBEACON API
         * -------------
         * Used when page is unloading. Guarantees delivery even if
         * the page closes before the request completes.
         * 
         * - Fire and forget (no response)
         * - Limited to 64KB payload
         * - Perfect for analytics on page close
         */
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.apiEndpoint, blob);
      } else {
        /**
         * FETCH API
         * ---------
         * Standard HTTP request for normal operation.
         * 
         * keepalive: true allows the request to survive page navigation
         * (similar to sendBeacon but with response handling)
         */
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Write-Key': this.writeKey,
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      // Success! Clear any persisted events
      this.clearStorage();
    } catch (error) {
      // Failed to send - save for later
      console.error('[Analytics] Flush failed, caching locally:', error);
      
      // Put events back in queue
      this.queue = [...batch, ...this.queue];
      
      // Persist to localStorage for recovery
      this.persistToStorage();
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Save queued events to localStorage.
   * Called when network requests fail.
   */
  private persistToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('analytics_queue', JSON.stringify(this.queue));
      }
    } catch (e) {
      // Storage full or unavailable - events will be lost
    }
  }

  /**
   * Recover events from localStorage.
   * Called when SDK initializes to resend failed events.
   */
  private recoverFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('analytics_queue');
        if (stored) {
          const events = JSON.parse(stored) as AnalyticsEvent[];
          // Add recovered events to the front of the queue
          this.queue = [...events, ...this.queue];
          // Clear storage to prevent double-sending
          this.clearStorage();
        }
      }
    } catch (e) {
      // Parse error - ignore corrupted data
    }
  }

  /**
   * Clear stored events from localStorage.
   */
  private clearStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('analytics_queue');
      }
    } catch (e) {
      // Ignore
    }
  }
}
