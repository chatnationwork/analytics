import { CrmApi, CrmApiError } from './client';
import { CrmApiConfig } from './types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CrmApi', () => {
  let client: CrmApi;
  const config: CrmApiConfig = {
    baseUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    timeout: 5000,
  };

  beforeEach(() => {
    client = new CrmApi(config);
    mockFetch.mockClear();
  });

  describe('Contact API', () => {
    describe('createContact', () => {
      it('should create a contact successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            chat_id: 'chat_123',
            whatsapp_number: '+254712345678',
            name: 'John Doe',
            created_at: '2026-01-16T08:00:00Z',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.createContact({
          whatsapp_number: '+254712345678',
          name: 'John Doe',
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/crm/chat',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'API-KEY': 'test-api-key',
              'Content-Type': 'application/json',
            },
          }),
        );
      });

      it('should throw CrmApiError on validation error', async () => {
        const mockErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [
              { field: 'whatsapp_number', message: 'Invalid phone number format' },
            ],
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve(mockErrorResponse),
        });

        await expect(
          client.createContact({ whatsapp_number: 'invalid' }),
        ).rejects.toThrow(CrmApiError);
      });
    });

    describe('searchContact', () => {
      it('should search contacts with correct query params', async () => {
        const mockResponse = {
          success: true,
          data: [
            {
              chat_id: 'chat_123',
              whatsapp_number: '+254712345678',
              email: 'user@example.com',
              name: 'John Doe',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.searchContact({
          search_field: 'email',
          search_value: 'user@example.com',
          condition: 'equal to',
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/crm/chat/search?'),
          expect.any(Object),
        );
      });
    });

    describe('listContacts', () => {
      it('should list contacts with pagination', async () => {
        const mockResponse = {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.listContacts({ page: 1, limit: 20 });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('markChatAsDone', () => {
      it('should mark chat as done', async () => {
        const mockResponse = { success: true, message: 'Chat marked as done' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.markChatAsDone('chat_123', {
          metadata: { resolution_notes: 'Resolved' },
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/crm/chat/setting/chat_123/operator/mark_as_done',
          expect.any(Object),
        );
      });
    });

    describe('assignChat', () => {
      it('should assign chat to operator', async () => {
        const mockResponse = {
          success: true,
          message: 'Chat assigned successfully',
          data: { assigned_to: 'agent@example.com' },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.assignChat('chat_123', {
          operator_email: 'agent@example.com',
          pause_automation: true,
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteContact', () => {
      it('should delete a contact', async () => {
        const mockResponse = { success: true, message: 'Contact deleted' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.deleteContact('chat_123');

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/crm/chat/chat_123',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });

  describe('Custom Field API', () => {
    describe('listCustomFields', () => {
      it('should list all custom fields', async () => {
        const mockResponse = {
          success: true,
          data: [
            { custom_field_id: 'cf_001', name: 'company', type: 'string', required: false },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.listCustomFields();

        expect(result).toEqual(mockResponse);
      });
    });

    describe('createCustomField', () => {
      it('should create a custom field', async () => {
        const mockResponse = {
          success: true,
          data: { custom_field_id: 'cf_002', name: 'department', type: 'string' },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.createCustomField({
          name: 'department',
          type: 'string',
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteCustomField', () => {
      it('should delete a custom field', async () => {
        const mockResponse = { success: true, message: 'Custom field deleted' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.deleteCustomField('cf_001');

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Campaign API', () => {
    describe('listCampaigns', () => {
      it('should list all campaigns', async () => {
        const mockResponse = {
          success: true,
          count: 1,
          page: 1,
          rows: 20,
          data: [
            {
              campaign_id: 'camp_001',
              name: 'Welcome Series',
              status: 'active',
              created_at: '2026-01-10T09:00:00Z',
              scheduled_at: null,
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.listCampaigns();

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCampaignReport', () => {
      it('should get campaign report', async () => {
        const mockResponse = {
          success: true,
          data: {
            campaign_id: 'camp_001',
            name: 'Welcome Series',
            metrics: {
              total_recipients: 1000,
              delivered: 980,
              read: 750,
              replied: 120,
              failed: 20,
            },
            delivery_rate: '98%',
            read_rate: '76.5%',
            reply_rate: '12.2%',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getCampaignReport('camp_001');

        expect(result).toEqual(mockResponse);
      });
    });

    describe('createCampaign', () => {
      it('should create a campaign', async () => {
        const mockResponse = {
          success: true,
          data: {
            campaign_id: 'camp_002',
            name: 'Product Launch',
            status: 'scheduled',
            scheduled_at: '2026-01-20T10:00:00Z',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.createCampaign({
          name: 'Product Launch',
          template_name: 'product_launch_v1',
          receivers: [
            { whatsapp_number: '+254712345678', variables: { '1': 'John' } },
          ],
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('cloneCampaign', () => {
      it('should clone a campaign', async () => {
        const mockResponse = {
          success: true,
          data: {
            campaign_id: 'camp_003',
            name: 'Welcome Series - Batch 2',
            status: 'draft',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.cloneCampaign({
          source_campaign_id: 'camp_001',
          new_name: 'Welcome Series - Batch 2',
          receivers: [{ whatsapp_number: '+254711111111' }],
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('triggerCampaign', () => {
      it('should trigger a campaign', async () => {
        const mockResponse = {
          success: true,
          message: 'Campaign triggered successfully',
          data: { campaign_id: 'camp_002', status: 'in_progress' },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.triggerCampaign('camp_002');

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Messages API', () => {
    describe('getMessages', () => {
      it('should get messages for a chat', async () => {
        const mockResponse = {
          success: true,
          data: {
            messages: [
              {
                message_id: 'msg_001',
                type: 'text',
                content: 'Hello!',
                direction: 'outbound',
                status: 'delivered',
                timestamp: '2026-01-16T08:30:00Z',
              },
            ],
            pagination: { page: 1, limit: 50, total: 1 },
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getMessages('chat_123', {
          page: 1,
          limit: 50,
          sort: 'newest',
        });

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw CrmApiError on 401 Unauthorized', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing API key',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const promise = client.listContacts();
      await expect(promise).rejects.toThrow(CrmApiError);
      await expect(promise).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should throw CrmApiError on 404 Not Found', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(client.deleteContact('invalid_id')).rejects.toThrow(CrmApiError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listContacts()).rejects.toThrow(CrmApiError);
      await expect(client.listContacts()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });
});
