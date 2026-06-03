'use client';

import { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, Power, PowerOff, Activity, Bell, MessageSquare, Webhook } from 'lucide-react';

interface SingleConditionValue { value: number | string; }
interface RangeConditionValue { min: number; max: number; }
interface InConditionValue { values: (number | string)[]; }
type ConditionValue = SingleConditionValue | RangeConditionValue | InConditionValue;

interface AlertTrigger {
  id: string;
  name: string;
  scope: string;
  scopeValue?: string;
  targetType: string;
  targetProperty: string;
  conditionType: string;
  conditionValue: ConditionValue;
  messageTemplate?: string;
  enabled: boolean;
  lookbackSeconds: number;
  autoResolveEnabled: boolean;
  autoResolveLookbackSeconds: number;
  noRetriggerSeconds: number;
  integrationIds?: string[];
  createdAt: string;
}

interface AlertIntegration {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'discord' | 'webhook';
  config: Record<string, any>;
  sendAllAlerts: boolean;
  enabled: boolean;
  createdAt: string;
}

import api from '../../lib/api';
import { useAuth } from '../../lib/use-auth';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { useRequirePermission } from '../../lib/use-require-permission';
import PageLoading from '../components/PageLoading';
import AccessDenied from '../components/AccessDenied';
import AlertTriggerForm from './AlertTriggerForm';
import IntegrationForm from './IntegrationForm';

type Tab = 'triggers' | 'integrations';

export default function AlertsConfiguration() {
  const { authorized, loading: authLoading } = useRequirePermission(PERMISSIONS.ALERTS_VIEW);
  const { user } = useAuth();
  const canConfigureAlerts = hasPermission(user, PERMISSIONS.ALERTS_CONFIGURE);
  const canManageIntegrations = hasPermission(user, PERMISSIONS.INTEGRATIONS_MANAGE);
  const [activeTab, setActiveTab] = useState<Tab>('triggers');

  const [targets, setTargets] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [integrations, setIntegrations] = useState<AlertIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<{ nodes: any[], namespaces: any[], pods: any[], pvcs: any[] }>({ nodes: [], namespaces: [], pods: [], pvcs: [] });
  const [latestMetrics, setLatestMetrics] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [targetsData, triggersData, clusterData, metricsData, integrationsData]: any = await Promise.all([
        api.get('alerts/targets').json(),
        api.get('alerts/triggers').json(),
        api.get('cluster-info').json(),
        api.get('metrics/latest').json(),
        api.get('alerts/integrations').json().catch(() => []),
      ]);

      setTargets(targetsData);
      setTriggers(triggersData);
      setClusterInfo(clusterData);
      setLatestMetrics(metricsData);
      setIntegrations(integrationsData);
    } catch (error) {
      console.error('Failed to fetch configuration data', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = async (id: string, currentlyEnabled: boolean) => {
    try {
      await api.patch(`alerts/triggers/${id}`, { json: { enabled: !currentlyEnabled } });
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled: !currentlyEnabled } : t));
    } catch (err) { console.error('Failed to toggle trigger', err); }
  };

  const deleteTrigger = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await api.delete(`alerts/triggers/${id}`);
      setTriggers(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error('Failed to delete trigger', err); }
  };

  const formatConditionValue = (conditionType: string, value: ConditionValue): string => {
    if (conditionType === 'range') { const r = value as RangeConditionValue; return `${r?.min ?? '?'} - ${r?.max ?? '?'}`; }
    if (conditionType === 'in') { const i = value as InConditionValue; return (i?.values || []).join(', '); }
    return String((value as SingleConditionValue)?.value ?? '');
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      await api.delete(`alerts/integrations/${id}`);
      setIntegrations(prev => prev.filter(i => i.id !== id));
    } catch (err) { console.error('Failed to delete integration', err); }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'discord': return <MessageSquare size={20} />;
      case 'slack': return <Bell size={20} />;
      case 'teams': return <Bell size={20} />;
      case 'webhook': return <Webhook size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getIntegrationNames = (ids?: string[]): string[] => {
    if (!ids?.length) return [];
    return ids.map(id => integrations.find(i => i.id === id)?.name).filter(Boolean) as string[];
  };

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return <AccessDenied title="Alerts Configuration" icon={<Settings size={32} className="text-[var(--accent)]" />} />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Settings size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">Alerts Configuration</h1>
        </div>
      </header>

      <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'triggers' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Activity size={16} className="inline mr-2" />
          Triggers
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Bell size={16} className="inline mr-2" />
          Integrations
        </button>
      </div>

      {activeTab === 'triggers' && (
        <>
          {canConfigureAlerts && (
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">
                <Plus size={18} />
                New Alert Trigger
              </button>
            </div>
          )}

          {showForm && (
            <AlertTriggerForm
              targets={targets}
              integrations={integrations}
              clusterInfo={clusterInfo}
              latestMetrics={latestMetrics}
              onSuccess={() => { setShowForm(false); fetchData(); }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <section>
            <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <Activity size={24} className="text-[var(--accent)]" />
              Configured Triggers
            </h2>

            {loading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading triggers...</div>
            ) : triggers.length === 0 ? (
              <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
                <Settings size={48} className="text-slate-600" />
                <p className="text-slate-400 max-w-md">No alert triggers configured. Click the button above to create one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6">
                {triggers.map(trigger => {
                  const integrationNames = getIntegrationNames(trigger.integrationIds);
                  const autoIntegrations = integrations.filter(i => i.sendAllAlerts && i.enabled);

                  return (
                    <div key={trigger.id} className={`glass p-6 rounded-3xl transition-all ${trigger.enabled ? 'border-[var(--accent)]/30 shadow-[0_4px_20px_0_var(--accent-glow)]' : 'opacity-70'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-slate-200">{trigger.name}</h3>
                          <p className="text-xs text-slate-400 flex gap-2 mt-1">
                            <span className="uppercase text-[var(--accent)] font-medium">{trigger.targetType}</span>
                            &bull;
                            <span className="capitalize">{trigger.scope}</span>
                            {trigger.scopeValue && <span className="opacity-80">({trigger.scopeValue})</span>}
                          </p>
                        </div>
                        {canConfigureAlerts && (
                          <div className="flex gap-2">
                            <button onClick={() => toggleTrigger(trigger.id, trigger.enabled)}
                              title={trigger.enabled ? "Disable Alert" : "Enable Alert"}
                              className={`p-2 rounded-xl transition-colors ${trigger.enabled ? 'bg-[var(--success-glow)] text-[var(--success)] hover:bg-[var(--success)]/30' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                              {trigger.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                            </button>
                            <button onClick={() => deleteTrigger(trigger.id)} title="Delete Alert"
                              className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 mt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Property</span>
                          <span className="font-mono text-slate-200">{trigger.targetProperty}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Condition</span>
                          <span className="font-mono text-slate-200">{trigger.conditionType}: {formatConditionValue(trigger.conditionType, trigger.conditionValue)}</span>
                        </div>
                        {trigger.lookbackSeconds > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Lookback</span>
                            <span className="font-mono text-slate-200">{trigger.lookbackSeconds}s</span>
                          </div>
                        )}
                        {trigger.noRetriggerSeconds > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Cooldown</span>
                            <span className="font-mono text-slate-200">{trigger.noRetriggerSeconds}s</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Auto-Resolve</span>
                          <span className={`font-mono ${trigger.autoResolveEnabled ? 'text-[var(--success)]' : 'text-slate-500'}`}>
                            {trigger.autoResolveEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      {(integrationNames.length > 0 || autoIntegrations.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {integrationNames.map(name => (
                            <span key={name} className="text-xs px-2 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center gap-1">
                              <MessageSquare size={12} />
                              {name}
                            </span>
                          ))}
                          {autoIntegrations.map(int => (
                            <span key={int.id} className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              {getIntegrationIcon(int.type)}
                              {int.name}
                              <span className="text-[10px] opacity-60">(auto)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'integrations' && (
        <>
          {canManageIntegrations && (
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowIntegrationForm(!showIntegrationForm)}
                className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">
                <Plus size={18} />
                New Integration
              </button>
            </div>
          )}

          {showIntegrationForm && (
            <IntegrationForm
              onSuccess={() => { setShowIntegrationForm(false); fetchData(); }}
              onCancel={() => setShowIntegrationForm(false)}
            />
          )}

          <section>
            <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <Bell size={24} className="text-[var(--accent)]" />
              Configured Integrations
            </h2>

            {loading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading integrations...</div>
            ) : integrations.length === 0 ? (
              <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
                <Bell size={48} className="text-slate-600" />
                <p className="text-slate-400 max-w-md">No integrations configured. Add Slack, Teams, or webhook integrations to receive alert notifications.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">
                {integrations.map(int => (
                  <div key={int.id} className={`glass p-6 rounded-3xl ${int.enabled ? '' : 'opacity-60'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          int.type === 'discord' ? 'bg-indigo-500/10 text-indigo-400' :
                          int.type === 'slack' ? 'bg-green-500/10 text-green-400' :
                          int.type === 'teams' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-orange-500/10 text-orange-400'
                        }`}>
                          {getIntegrationIcon(int.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-200">{int.name}</h3>
                          <p className="text-xs text-slate-500 capitalize">{int.type}</p>
                        </div>
                      </div>
                      {canManageIntegrations && (
                        <button onClick={() => deleteIntegration(int.id)} title="Delete Integration"
                          className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                      {int.type !== 'webhook' ? (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Webhook URL</span>
                          <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]">{int.config?.webhookUrl}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">URL</span>
                          <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]">{int.config?.url}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Mode</span>
                        <span className={`font-mono ${int.sendAllAlerts ? 'text-purple-400' : 'text-slate-300'}`}>
                          {int.sendAllAlerts ? 'All alerts' : 'Per trigger'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}