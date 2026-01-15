/**
 * =============================================================================
 * STORAGE CLASS
 * =============================================================================
 * 
 * Manages persistent identity and session data in the browser.
 * 
 * THREE TYPES OF IDS:
 * ------------------
 * 
 * 1. ANONYMOUS_ID
 *    - A UUID stored in localStorage
 *    - Persists forever (until cleared)
 *    - Identifies a device/browser
 *    - Same user can have multiple (one per browser/device)
 * 
 * 2. USER_ID
 *    - Set by you when user logs in
 *    - Links to your system's user ID
 *    - Stored in localStorage
 *    - Cleared on logout (reset)
 * 
 * 3. SESSION_ID  
 *    - A UUID stored in sessionStorage
 *    - Reset after inactivity timeout (default: 30 min)
 *    - Groups events into a "visit"
 *    - New tab = new session
 * 
 * STORAGE TYPES:
 * -------------
 * localStorage: Persists until cleared (anonymous_id, user_id)
 * sessionStorage: Cleared when tab closes (session_id)
 */

/**
 * Keys used for localStorage/sessionStorage.
 * Using a prefix prevents conflicts with other libraries.
 */
const STORAGE_KEYS = {
  ANONYMOUS_ID: 'analytics_anonymous_id',
  USER_ID: 'analytics_user_id',
  SESSION_ID: 'analytics_session',
  LAST_ACTIVITY: 'analytics_last_activity',
};

/**
 * Manages identity and session persistence.
 */
export class Storage {
  /** Cached anonymous ID */
  private anonymousId: string | null = null;
  
  /** Cached user ID */
  private userId: string | null = null;
  
  /** Cached session ID */
  private sessionId: string | null = null;

  /**
   * Create a new Storage instance.
   * 
   * @param sessionTimeoutMs - Inactivity timeout for sessions (30 min default)
   */
  constructor(private sessionTimeoutMs: number) {
    // Load any existing IDs from storage
    this.load();
  }

  // =========================================================================
  // ANONYMOUS ID
  // =========================================================================

  /**
   * Get the anonymous ID.
   * 
   * Creates and persists a new one if none exists.
   * This ID stays the same forever for this browser.
   * 
   * @returns UUID string
   */
  getAnonymousId(): string {
    if (!this.anonymousId) {
      this.anonymousId = this.generateId();
      this.persist(STORAGE_KEYS.ANONYMOUS_ID, this.anonymousId);
    }
    return this.anonymousId;
  }

  // =========================================================================
  // USER ID
  // =========================================================================

  /**
   * Get the user ID if set.
   * 
   * @returns User ID or undefined if not identified
   */
  getUserId(): string | undefined {
    return this.userId || undefined;
  }

  /**
   * Set the user ID (after login/identify).
   * 
   * @param id - The user's identifier from your system
   */
  setUserId(id: string): void {
    this.userId = id;
    this.persist(STORAGE_KEYS.USER_ID, id);
  }

  /**
   * Clear the user ID (logout).
   */
  clearUserId(): void {
    this.userId = null;
    this.remove(STORAGE_KEYS.USER_ID);
  }

  // =========================================================================
  // SESSION ID
  // =========================================================================

  /**
   * Get the current session ID.
   * 
   * SESSION TIMEOUT LOGIC:
   * ---------------------
   * 1. Get the timestamp of the last activity
   * 2. If more than sessionTimeoutMs has passed → new session
   * 3. Update last activity timestamp
   * 4. Return session ID
   * 
   * @returns UUID string for current session
   */
  getSessionId(): string {
    const now = Date.now();
    const lastActivity = this.getLastActivity();

    // Check for session timeout
    if (!this.sessionId || (now - lastActivity > this.sessionTimeoutMs)) {
      // Create new session
      this.sessionId = this.generateId();
      this.persistSession(STORAGE_KEYS.SESSION_ID, this.sessionId);
    }

    // Update last activity (touch the session)
    this.persistSession(STORAGE_KEYS.LAST_ACTIVITY, now.toString());

    return this.sessionId;
  }

  /**
   * Force reset the session (logout, etc).
   */
  resetSession(): void {
    this.sessionId = null;
    this.removeSession(STORAGE_KEYS.SESSION_ID);
    this.removeSession(STORAGE_KEYS.LAST_ACTIVITY);
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  /**
   * Load IDs from storage on initialization.
   */
  private load(): void {
    try {
      this.anonymousId = this.retrieve(STORAGE_KEYS.ANONYMOUS_ID);
      this.userId = this.retrieve(STORAGE_KEYS.USER_ID);
      this.sessionId = this.retrieveSession(STORAGE_KEYS.SESSION_ID);
    } catch (e) {
      // Storage unavailable (incognito mode, etc.)
    }
  }

  /**
   * Get the timestamp of last activity.
   * 
   * @returns Timestamp or 0 if not set
   */
  private getLastActivity(): number {
    const stored = this.retrieveSession(STORAGE_KEYS.LAST_ACTIVITY);
    return stored ? parseInt(stored, 10) : 0;
  }

  // =========================================================================
  // localStorage helpers (for persistent data)
  // =========================================================================

  private persist(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Storage full or unavailable
    }
  }

  private retrieve(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      // Storage unavailable
    }
    return null;
  }

  private remove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore
    }
  }

  // =========================================================================
  // sessionStorage helpers (for session-scoped data)
  // =========================================================================

  private persistSession(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {
      // Fallback to localStorage
      this.persist(key, value);
    }
  }

  private retrieveSession(key: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(key);
      }
    } catch (e) {
      return this.retrieve(key);
    }
    return null;
  }

  private removeSession(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      this.remove(key);
    }
  }

  // =========================================================================
  // UUID generation
  // =========================================================================

  /**
   * Generate a UUID v4.
   * 
   * Uses crypto.randomUUID() if available (modern browsers),
   * falls back to Math.random() for older browsers.
   */
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
