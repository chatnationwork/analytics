# CRM API Client Library

A type-safe TypeScript client for interacting with the CRM API.

## Installation

The library is included in the monorepo. Import it from `@libs/crm-api`:

```typescript
import { createCrmApiClient } from '@libs/crm-api';
```

## Quick Start

```typescript
import { createCrmApiClient, CrmApiError } from '@libs/crm-api';

// Initialize the client
const client = createCrmApiClient({
  baseUrl: 'https://api.yourdomain.com',
  apiKey: 'your-api-key',
  timeout: 30000, // Optional, default is 30000ms
});

// Use the client
try {
  const contacts = await client.listContacts({ page: 1, limit: 20 });
  console.log(contacts.data.contacts);
} catch (error) {
  if (error instanceof CrmApiError) {
    console.error(`API Error: ${error.code} - ${error.message}`);
  }
}
```

## API Reference

### Contact API

#### Create Contact
```typescript
const contact = await client.createContact({
  whatsapp_number: '+254712345678',
  email: 'user@example.com',
  name: 'John Doe',
  custom_fields: {
    company: 'Acme Inc',
    role: 'Developer',
  },
});
```

#### Search Contacts
```typescript
const results = await client.searchContact({
  search_field: 'email',
  search_value: 'user@example.com',
  condition: 'equal to', // 'contains', 'starts with', 'ends with'
});
```

#### List Contacts
```typescript
const contacts = await client.listContacts({
  page: 1,
  limit: 20,
});
```

#### Get Custom Fields for Chat
```typescript
const fields = await client.getChatCustomFields('chat_123');
```

#### Mark Chat as Done
```typescript
await client.markChatAsDone('chat_123', {
  metadata: {
    resolution_notes: 'Issue resolved successfully',
  },
});
```

#### Assign Chat
```typescript
await client.assignChat('chat_123', {
  operator_email: 'agent@company.com',
  pause_automation: true,
});
```

#### Delete Contact
```typescript
await client.deleteContact('chat_123');
```

### Custom Field API

#### List Custom Fields
```typescript
const fields = await client.listCustomFields();
```

#### Create Custom Field
```typescript
const field = await client.createCustomField({
  name: 'department',
  type: 'string',
  required: false,
});
```

#### Delete Custom Field
```typescript
await client.deleteCustomField('cf_001');
```

### Campaign API

#### List Campaigns
```typescript
const campaigns = await client.listCampaigns();
```

#### Get Campaign Report
```typescript
const report = await client.getCampaignReport('camp_001');
console.log(report.data.metrics);
// { total_recipients: 1000, delivered: 980, read: 750, ... }
```

#### Create Campaign
```typescript
const campaign = await client.createCampaign({
  name: 'Product Launch Announcement',
  template_name: 'product_launch_v1',
  template_language: 'en',
  receivers: [
    {
      whatsapp_number: '+254712345678',
      variables: { '1': 'John', '2': 'Product X' },
    },
    {
      whatsapp_number: '+254798765432',
      variables: { '1': 'Jane', '2': 'Product X' },
    },
  ],
  scheduled_at: '2026-01-20T10:00:00Z',
});
```

#### Clone Campaign
```typescript
const cloned = await client.cloneCampaign({
  source_campaign_id: 'camp_001',
  new_name: 'Welcome Series - Batch 2',
  receivers: [
    { whatsapp_number: '+254711111111', variables: { '1': 'Alice' } },
  ],
});
```

#### Trigger Campaign
```typescript
await client.triggerCampaign('camp_002');
```

### Messages API

#### Get Messages
```typescript
const messages = await client.getMessages('chat_123', {
  page: 1,
  limit: 50,
  sort: 'newest', // or 'oldest'
});
```

## Error Handling

All API errors are thrown as `CrmApiError` instances:

```typescript
import { CrmApiError } from '@libs/crm-api';

try {
  await client.createContact({ whatsapp_number: 'invalid' });
} catch (error) {
  if (error instanceof CrmApiError) {
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    
    // Handle specific error codes
    switch (error.code) {
      case 'UNAUTHORIZED':
        // Handle authentication error
        break;
      case 'VALIDATION_ERROR':
        // Handle validation error
        error.details?.forEach(detail => {
          console.error(`${detail.field}: ${detail.message}`);
        });
        break;
      case 'NOT_FOUND':
        // Handle not found error
        break;
      case 'TIMEOUT':
        // Handle timeout error
        break;
      case 'NETWORK_ERROR':
        // Handle network error
        break;
    }
  }
}
```

## Types

All types are exported from the library:

```typescript
import {
  // Config
  CrmApiConfig,
  CrmApiClient,
  
  // Contact types
  Contact,
  CreateContactRequest,
  SearchContactParams,
  
  // Campaign types
  Campaign,
  CampaignStatus,
  CreateCampaignRequest,
  CampaignMetrics,
  
  // Message types
  Message,
  MessageType,
  MessageDirection,
  MessageStatus,
  
  // ... and more
} from '@libs/crm-api';
```

## Testing

Run the tests:

```bash
npm test libs/crm-api
```

## Related Documentation

- [CRM API Documentation](../../docs/crm_api_documentation.md) - Full API reference
- [OpenAPI Specification](../../docs/crm_api_openapi.yaml) - OpenAPI 3.0 spec
- [Postman Collection](../../docs/crm_api_postman_collection.json) - Import into Postman
