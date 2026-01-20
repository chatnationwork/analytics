'use client';

import { useState, useEffect } from 'react';
import { CrmSettings } from '@/components/settings/CrmSettings';
import { ApiKeySettings } from '@/components/settings/ApiKeySettings';
import { TeamManagement } from '@/components/settings/team-management';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'crm' | 'team'>('api-keys');
  const [tenantId, setTenantId] = useState<string>('');
  
  useEffect(() => {
      fetch('/api/dashboard/tenants/current')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(response => {
          const tenantData = response.data || response;
          if (tenantData?.tenantId) {
            setTenantId(tenantData.tenantId);
          }
        })
        .catch(err => console.error('Failed to fetch tenant:', err));
  }, []);

  const tabs = [
    { id: 'api-keys' as const, label: 'API Keys' },
    { id: 'crm' as const, label: 'CRM Integrations' },
    { id: 'team' as const, label: 'Team' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your workspace configuration</p>
      </div>

      <div className="border-b border-white/10">
        <nav className="-mb-px flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="py-4">
        {activeTab === 'api-keys' && (
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <ApiKeySettings />
          </div>
        )}
        {activeTab === 'crm' && (
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <CrmSettings />
          </div>
        )}
        {activeTab === 'team' && (
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <TeamManagement tenantId={tenantId} />
          </div>
        )}
      </div>
    </div>
  );
}
