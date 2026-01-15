/**
 * =============================================================================
 * GEOIP ENRICHER
 * =============================================================================
 * 
 * Converts IP addresses into geographic information.
 * 
 * WHAT IS GEOIP?
 * -------------
 * GeoIP databases map IP addresses to physical locations.
 * This lets us know where our users are located without asking them.
 * 
 * HOW IT WORKS:
 * ------------
 * 1. User's device has an IP address (e.g., 203.0.113.45)
 * 2. We look up this IP in a GeoIP database
 * 3. Database returns: Country "KE", City "Nairobi"
 * 
 * LIBRARY USED: geoip-lite
 * ------------------------
 * A free, local GeoIP database. For production, consider:
 * - MaxMind GeoIP2 (more accurate, requires license)
 * - IP2Location
 * 
 * PRIVACY NOTE:
 * ------------
 * We only store country/city, not exact coordinates.
 * The raw IP can be discarded after enrichment if needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';

/**
 * Geographic data extracted from an IP address.
 */
export interface GeoData {
  /** Two-letter country code (e.g., "KE" for Kenya) */
  countryCode?: string;
  /** City name (e.g., "Nairobi") */
  city?: string;
}

@Injectable()
export class GeoipEnricher {
  private readonly logger = new Logger(GeoipEnricher.name);

  /**
   * Enrich an IP address with geographic data.
   * 
   * @param ipAddress - The IP address to look up
   * @returns Geographic data (country and city) if found
   * 
   * @example
   * const geo = geoipEnricher.enrich('203.0.113.45');
   * // Returns: { countryCode: 'KE', city: 'Nairobi' }
   */
  enrich(ipAddress?: string): GeoData {
    // Can't look up nothing
    if (!ipAddress) {
      return {};
    }

    try {
      // Look up the IP in the local GeoIP database
      const geo = geoip.lookup(ipAddress);

      // IP not found in database (private IP, unknown, etc.)
      if (!geo) {
        return {};
      }

      return {
        countryCode: geo.country || undefined,
        city: geo.city || undefined,
      };
    } catch (error) {
      // Don't let GeoIP errors crash the processor
      this.logger.warn(`Failed to lookup IP ${ipAddress}: ${error.message}`);
      return {};
    }
  }
}
