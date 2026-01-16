/**
 * CRM API Library
 * 
 * A type-safe client for interacting with the CRM API
 * 
 * @example
 * ```typescript
 * import { createCrmApiClient } from '@libs/crm-api';
 * 
 * const client = createCrmApiClient({
 *   baseUrl: 'https://api.yourdomain.com',
 *   apiKey: 'your-api-key',
 * });
 * 
 * // Create a contact
 * const contact = await client.createContact({
 *   whatsapp_number: '+254712345678',
 *   name: 'John Doe',
 * });
 * 
 * // List campaigns
 * const campaigns = await client.listCampaigns();
 * ```
 */

export { CrmApi, CrmApiError, createCrmApiClient } from './client';
export * from './types';
