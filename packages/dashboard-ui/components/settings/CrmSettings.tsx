'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { Trash2, Plus, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiUrl: z.string().url('Must be a valid URL'),
  apiKey: z.string().min(1, 'API Key is required'),
  phoneNumberId: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CrmSettings() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['crm-integrations'],
    queryFn: settingsApi.getCrmIntegrations,
  });

  const createMutation = useMutation({
    mutationFn: settingsApi.createCrmIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('Integration added successfully');
      setIsAdding(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteCrmIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('Integration deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: settingsApi.testCrmConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      config: {
        provider: 'meta',
        phoneNumberId: data.phoneNumberId,
        phoneNumber: data.phoneNumber,
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">CRM Integrations</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connect to your external CRM to sync contacts and analyze messaging campaigns.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-md hover:bg-[var(--primary-dark)] transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Add Integration
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-base font-medium mb-4 dark:text-white">New Integration</h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Production WhatsApp"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API URL</label>
                <input
                  {...register('apiUrl')}
                  placeholder="https://crm.example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                />
                {errors.apiUrl && <p className="text-red-500 text-xs mt-1">{errors.apiUrl.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</label>
                <input
                  {...register('phoneNumberId')}
                  placeholder="e.g. 100012345678901"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <input
                  {...register('phoneNumber')}
                  placeholder="e.g. 254712345678"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key / Access Token</label>
              <input
                type="password"
                {...register('apiKey')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
              />
              {errors.apiKey && <p className="text-red-500 text-xs mt-1">{errors.apiKey.message}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  reset();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Integration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Connected</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {integrations?.map((integration) => (
                <tr key={integration.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{integration.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{integration.apiUrl}</div>
                    {integration.config?.phoneNumber && (
                       <div className="text-xs text-gray-400 mt-0.5">WA: {integration.config.phoneNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {integration.lastError ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle size={12} /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle size={12} /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {integration.lastConnectedAt ? new Date(integration.lastConnectedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                    <button
                      onClick={() => testMutation.mutate(integration.id)}
                      disabled={testMutation.isPending}
                      className="text-[var(--primary)] hover:text-[var(--primary-dark)] flex items-center gap-1"
                      title="Test Connection"
                    >
                      <Zap size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this integration?')) {
                          deleteMutation.mutate(integration.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {integrations?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No integrations found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
