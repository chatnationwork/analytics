/**
 * =============================================================================
 * ANALYTICS SDK - MAIN ENTRY POINT
 * =============================================================================
 * 
 * This is the barrel export for the SDK package.
 * 
 * USAGE IN CLIENT CODE:
 * --------------------
 * import Analytics from '@analytics/sdk';
 * 
 * Analytics.init('your-write-key');
 * Analytics.page();
 * Analytics.track('button_click', { button: 'submit' });
 */

// Main Analytics class and options interface
export { Analytics, AnalyticsOptions } from './core/analytics';

// Default export for easier importing
export { default } from './core/analytics';
