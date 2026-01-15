/**
 * =============================================================================
 * USER-AGENT ENRICHER
 * =============================================================================
 * 
 * Parses User-Agent strings to extract device and browser information.
 * 
 * WHAT IS A USER-AGENT?
 * --------------------
 * Every HTTP request includes a User-Agent header that identifies the client.
 * Example: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit..."
 * 
 * This cryptic string tells us:
 * - Device type: mobile, tablet, desktop
 * - Operating system: iOS 15
 * - Browser: Safari
 * 
 * WHY PARSE IT?
 * ------------
 * - Analytics: "What % of users are on mobile?"
 * - Debugging: "This bug only happens on Chrome"
 * - Optimization: "Should we focus on mobile-first?"
 * 
 * LIBRARY USED: ua-parser-js
 * -------------------------
 * A reliable library for parsing User-Agent strings.
 * It handles the many quirks of different browsers and devices.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as UAParser from 'ua-parser-js';

/**
 * Device and browser information extracted from User-Agent.
 */
export interface DeviceData {
  /** Type of device: "desktop", "mobile", or "tablet" */
  deviceType?: string;
  /** Operating system name: "iOS", "Android", "Windows", etc. */
  osName?: string;
  /** Operating system version: "15.0", "11", etc. */
  osVersion?: string;
  /** Browser name: "Chrome", "Safari", "Firefox", etc. */
  browserName?: string;
  /** Browser version: "98.0.4758.102", etc. */
  browserVersion?: string;
}

@Injectable()
export class UseragentEnricher {
  private readonly logger = new Logger(UseragentEnricher.name);
  
  /**
   * UAParser instance for parsing User-Agent strings.
   * We reuse the same instance for performance.
   */
  private readonly parser = new UAParser();

  /**
   * Parse a User-Agent string and extract device/browser info.
   * 
   * @param userAgent - The User-Agent header value
   * @returns Parsed device and browser information
   * 
   * @example
   * const device = useragentEnricher.enrich('Mozilla/5.0 (iPhone...)');
   * // Returns: { deviceType: 'mobile', osName: 'iOS', browserName: 'Safari', ... }
   */
  enrich(userAgent?: string): DeviceData {
    if (!userAgent) {
      return {};
    }

    try {
      // Set the User-Agent string to parse
      this.parser.setUA(userAgent);
      
      // Get all parsed information
      const result = this.parser.getResult();

      return {
        deviceType: this.normalizeDeviceType(result.device.type),
        osName: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        browserName: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse UA: ${error.message}`);
      return {};
    }
  }

  /**
   * Normalize device type to one of three values.
   * 
   * ua-parser-js returns various device types, but for analytics
   * we simplify to: desktop, mobile, tablet.
   * 
   * If no device type is detected, it's likely a desktop browser.
   * 
   * @param type - Raw device type from ua-parser-js
   * @returns Normalized device type
   */
  private normalizeDeviceType(type?: string): string {
    if (!type) return 'desktop';

    switch (type.toLowerCase()) {
      case 'mobile':
        return 'mobile';
      case 'tablet':
        return 'tablet';
      default:
        return 'desktop';
    }
  }
}
