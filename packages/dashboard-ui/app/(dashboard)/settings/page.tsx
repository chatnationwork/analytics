'use client';

import { useState, useEffect } from 'react';
import { CrmSettings } from '@/components/settings/CrmSettings';
import { ApiKeySettings } from '@/components/settings/ApiKeySettings';
import { TeamManagement } from '@/components/settings/team-management';
import { SessionSettings } from '@/components/settings/SessionSettings';
import { fetchWithAuth } from '@/lib/api';
import { usePermission } from '@/components/auth/PermissionContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'crm' | 'team' | 'session'>('api-keys');
  const [tenantId, setTenantId] = useState<string>('');
  
  useEffect(() => {
      fetchWithAuth('/tenants/current')
        .then(tenantData => {
          if (tenantData?.tenantId) {
            setTenantId(tenantData.tenantId);
          } else {
            console.error('Tenant response missing tenantId:', tenantData);
          }
        })
        .catch(err => console.error('Failed to fetch tenant:', err.message));
  }, []);

  const { can, isLoading } = usePermission();

  const allTabs = [
    { id: 'api-keys' as const, label: 'API Keys', permission: 'settings.manage' },
    { id: 'crm' as const, label: 'CRM Integrations', permission: 'settings.manage' },
    { id: 'team' as const, label: 'Team', permission: 'teams.manage' },
    { id: 'session' as const, label: 'Session', permission: 'settings.manage' },
  ];

  const tabs = allTabs.filter(tab => !tab.permission || can(tab.permission));

  // Reset active tab if current one is hidden
  useEffect(() => {
    if (!isLoading && tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
    }
  }, [isLoading, tabs, activeTab]);

  if (isLoading) return null;

  if (tabs.length === 0) {
      return (
          <div className="text-center py-12 text-muted-foreground">
              You do not have access to any settings.
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace configuration</p>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="py-4">
        {activeTab === 'api-keys' && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <ApiKeySettings tenantId={tenantId} />
          </div>
        )}
        {activeTab === 'crm' && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <CrmSettings />
          </div>
        )}
        {activeTab === 'team' && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <TeamManagement tenantId={tenantId} />
          </div>
        )}
        {activeTab === 'session' && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <SessionSettings tenantId={tenantId} />
          </div>
        )}
      </div>
    </div>
  );
}
