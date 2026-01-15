/**
 * =============================================================================
 * CONTEXT BUILDER
 * =============================================================================
 * 
 * Builds the context object that's sent with every event.
 * 
 * WHAT IS CONTEXT?
 * ---------------
 * Context is metadata about WHERE and HOW an event occurred:
 * - What page was the user on?
 * - What browser/device are they using?
 * - What SDK version sent this event?
 * 
 * This is different from PROPERTIES which are event-specific data.
 * 
 * CONTEXT STRUCTURE:
 * -----------------
 * {
 *   library: { name, version },   // SDK info
 *   page: { path, url, title },   // Page info
 *   userAgent: "...",             // Browser string
 *   locale: "en-US",              // Language
 *   screen: { width, height }     // Screen size
 * }
 */

/**
 * Shape of the context object.
 */
export interface Context {
  /** SDK information */
  library: {
    name: string;
    version: string;
  };
  /** Current page information */
  page?: {
    path: string;
    referrer: string;
    search: string;
    title: string;
    url: string;
  };
  /** Raw User-Agent string */
  userAgent?: string;
  /** Browser locale (e.g., "en-KE") */
  locale?: string;
  /** Screen dimensions */
  screen?: {
    width: number;
    height: number;
  };
  /** Phase 2: Handshake token for cross-channel identity */
  handshakeToken?: string;
}

/**
 * Build the context object from browser APIs.
 * 
 * Extracts information about the current page and device.
 * Safe to call in server-side rendering (returns minimal context).
 * 
 * @returns Context object with available information
 */
export function buildContext(): Context {
  // Start with SDK info (always available)
  const context: Context = {
    library: {
      name: '@analytics/sdk',
      version: '1.0.0',
    },
  };

  // Only access browser APIs if we're in a browser
  if (typeof window !== 'undefined') {
    // PAGE INFORMATION
    // ----------------
    // Where is the user right now?
    context.page = {
      path: window.location.pathname,    // e.g., "/mri/validation"
      referrer: document.referrer,        // e.g., "https://google.com"
      search: window.location.search,     // e.g., "?source=whatsapp"
      title: document.title,              // e.g., "MRI Validation"
      url: window.location.href,          // Full URL
    };

    // USER AGENT
    // ----------
    // Browser identification string (parsed by server)
    if (navigator?.userAgent) {
      context.userAgent = navigator.userAgent;
    }

    // LOCALE
    // ------
    // User's language preference
    if (navigator?.language) {
      context.locale = navigator.language;
    }

    // SCREEN SIZE
    // -----------
    // Useful for responsive design analytics
    if (window.screen) {
      context.screen = {
        width: window.screen.width,
        height: window.screen.height,
      };
    }

    // HANDSHAKE TOKEN (Phase 2 preparation)
    // -------------------------------------
    // When a user clicks a link from WhatsApp, the URL contains
    // a handshake token that links their chat identity to web identity.
    //
    // Example URL: https://app.example.com/mri?hs_token=abc123
    const params = new URLSearchParams(window.location.search);
    const hsToken = params.get('hs_token');
    if (hsToken) {
      context.handshakeToken = hsToken;
    }
  }

  return context;
}
