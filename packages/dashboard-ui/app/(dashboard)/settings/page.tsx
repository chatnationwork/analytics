'use client';

import { useState, useEffect } from 'react';
import { CrmSettings } from '@/components/settings/CrmSettings';
import { ApiKeySettings } from '@/components/settings/ApiKeySettings';
import { TeamManagement } from '@/components/settings/team-management';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'crm' | 'api-keys' | 'team'>('crm');
  const [tenantId, setTenantId] = useState<string>('');
  
  useEffect(() => {
      fetch('/api/dashboard/tenants/current')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(response => {
          // API wraps response in { status, data, timestamp }
          const tenantData = response.data || response;
          console.log('Tenant data:', tenantData);
          if (tenantData?.tenantId) {
            setTenantId(tenantData.tenantId);
          } else {
            console.error('No tenantId in response:', response);
          }
        })
        .catch(err => console.error('Failed to fetch tenant:', err));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your workspace configuration</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('crm')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'crm'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
          >
            CRM Integrations
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'api-keys'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'team'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
          >
            Team Management
          </button>
        </nav>
      </div>

      <div className="py-4">
        {activeTab === 'crm' && <CrmSettings />}
        {activeTab === 'api-keys' && <ApiKeySettings />}
        {activeTab === 'team' && <TeamManagement tenantId={tenantId} />}
      </div>
    </div>
  );
}

