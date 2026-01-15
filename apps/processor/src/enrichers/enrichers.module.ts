/**
 * =============================================================================
 * ENRICHERS MODULE
 * =============================================================================
 * 
 * Groups all data enrichment services together.
 * 
 * WHAT IS DATA ENRICHMENT?
 * -----------------------
 * The SDK sends raw data (IP address, User-Agent string).
 * Enrichment transforms this into useful information:
 * 
 * - IP "203.0.113.45" → Country "KE", City "Nairobi"
 * - User-Agent "Mozilla/5.0..." → Device "mobile", Browser "Chrome"
 * 
 * This makes the data much more useful for analytics.
 */

import { Module } from '@nestjs/common';
import { GeoipEnricher } from './geoip.enricher';
import { UseragentEnricher } from './useragent.enricher';

@Module({
  providers: [GeoipEnricher, UseragentEnricher],
  exports: [GeoipEnricher, UseragentEnricher],
})
export class EnrichersModule {}
