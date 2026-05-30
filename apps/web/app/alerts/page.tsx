'use client';

import { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, Power, PowerOff, Activity, Bell, MessageSquare, Webhook } from 'lucide-react';

// === ConditionValue types ===
interface SingleConditionValue { value: number | string; }
interface RangeConditionValue { min: number; max: number; }
interface InConditionValue { values: (number | string)[]; }
type ConditionValue = SingleConditionValue | RangeConditionValue | InConditionValue;

interface TargetProperty {
  propertyKey: string;
  name: string;
  label: string;
  type: 'number' | 'string' | 'enum';
  enumValues?: string[];
  unit?: string;
  description?: string;
  supportedConditionTypes: string[];
}

interface TargetSchema {
  type: string;
  label: string;
  properties: TargetProperty[];
}

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

type Tab = 'triggers' | 'integrations';

export default function AlertsConfiguration() {
  const [activeTab, setActiveTab] = useState<Tab>('triggers');

  // Shared state
  const [targets, setTargets] = useState<TargetSchema[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [integrations, setIntegrations] = useState<AlertIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<{ nodes: any[], namespaces: any[], pods: any[], pvcs: any[] }>({ nodes: [], namespaces: [], pods: [], pvcs: [] });
  const [latestMetrics, setLatestMetrics] = useState<any[]>([]);

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

  // ===================== TRIGGER FORM STATE =====================
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetProperty, setTargetProperty] = useState('');
  const [conditionType, setConditionType] = useState('');
  const [conditionValue, setConditionValue] = useState<ConditionValue | null>(null);
  const [scope, setScope] = useState('');
  const [scopeValue, setScopeValue] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [lookbackSeconds, setLookbackSeconds] = useState(0);
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(true);
  const [autoResolveLookbackSeconds, setAutoResolveLookbackSeconds] = useState(0);
  const [noRetriggerSeconds, setNoRetriggerSeconds] = useState(0);
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([]);

  const [selectedTarget, setSelectedTarget] = useState<TargetSchema | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<TargetProperty | null>(null);

  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTargetType(val);
    setTargetProperty('');
    setConditionType('');
    setConditionValue(null);
    setScope('');
    setScopeValue('');
    const target = targets.find(t => t.type === val) || null;
    setSelectedTarget(target);
    setSelectedProperty(null);
    if (target) setScope('cluster');
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTargetProperty(val);
    setConditionType('');
    setConditionValue(null);
    const prop = selectedTarget?.properties.find(p => p.name === val) || null;
    setSelectedProperty(prop);
    if (prop) setConditionType(prop.supportedConditionTypes[0] || '');
  };

  const handleConditionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConditionType(e.target.value);
    setConditionValue(null);
  };

  const buildConditionValue = (ct: string, raw: any): ConditionValue => {
    if (ct === 'range') return { min: raw.min ?? 0, max: raw.max ?? 0 };
    if (ct === 'in') return { values: raw.values ?? [] };
    return { value: raw };
  };

  const renderConditionValueInput = () => {
    if (!selectedProperty) return null;
    const { type, enumValues, unit } = selectedProperty;

    if (type === 'enum' && enumValues) {
      if (conditionType === 'in') {
        return (
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Select values (hold Ctrl/Cmd for multiple)</label>
            <select multiple className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors h-32"
              value={((conditionValue as InConditionValue)?.values || []).map(String)}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                setConditionValue(buildConditionValue('in', { values: selected }));
              }}>
              {enumValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Value</label>
          <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
            value={(conditionValue as SingleConditionValue)?.value ?? ''}
            onChange={e => setConditionValue(buildConditionValue(conditionType, e.target.value))}>
            <option value="">Select a value</option>
            {enumValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      );
    }

    if (conditionType === 'range') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Min {unit ? `(${unit})` : ''}</label>
            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
              value={(conditionValue as RangeConditionValue)?.min ?? ''}
              onChange={e => setConditionValue(buildConditionValue('range', { min: parseFloat(e.target.value) || 0, max: (conditionValue as RangeConditionValue)?.max ?? 0 }))}
              placeholder="Minimum" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Max {unit ? `(${unit})` : ''}</label>
            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
              value={(conditionValue as RangeConditionValue)?.max ?? ''}
              onChange={e => setConditionValue(buildConditionValue('range', { min: (conditionValue as RangeConditionValue)?.min ?? 0, max: parseFloat(e.target.value) || 0 }))}
              placeholder="Maximum" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Value {unit ? `(${unit})` : ''}</label>
        <input type={type === 'number' ? 'number' : 'text'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
          value={(conditionValue as SingleConditionValue)?.value ?? ''}
          onChange={e => setConditionValue(buildConditionValue(conditionType, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value))}
          placeholder={`Enter value`} />
      </div>
    );
  };

  const getScopeOptions = () => {
    if (!selectedTarget) return [];
    const scopes = ['cluster'];
    if (selectedTarget.type === 'Pod' || selectedTarget.type === 'PVC') scopes.push('namespace');
    scopes.push(selectedTarget.type.toLowerCase());
    return scopes;
  };

  const getScopeValueOptions = () => {
    if (scope === 'cluster') return [];
    if (scope === 'namespace') return clusterInfo.namespaces.map(ns => ({ value: ns.name, label: ns.name }));
    if (scope === 'node') return latestMetrics.map((m: any) => ({ value: m.machineId, label: m.machineId }));
    if (scope === 'pod') return clusterInfo.pods.filter(Boolean).map((pod: any) => ({ value: pod.name, label: `${pod.namespace}/${pod.name}` }));
    if (scope === 'pvc') return (clusterInfo.pvcs || []).map((pvc: any) => ({ value: pvc.name, label: `${pvc.namespace}/${pvc.name}` }));
    return [];
  };

  const handleCreateTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('alerts/triggers', {
        json: {
          name, targetType, targetProperty, conditionType, conditionValue,
          scope, scopeValue: scopeValue || null,
          messageTemplate: messageTemplate || null,
          enabled: true, lookbackSeconds, autoResolveEnabled, autoResolveLookbackSeconds, noRetriggerSeconds,
          integrationIds: selectedIntegrationIds,
        },
      });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Failed to create trigger', err);
    }
  };

  const resetForm = () => {
    setName(''); setTargetType(''); setTargetProperty(''); setConditionType(''); setConditionValue(null);
    setScope(''); setScopeValue(''); setMessageTemplate(''); setLookbackSeconds(0);
    setAutoResolveEnabled(true); setAutoResolveLookbackSeconds(0); setNoRetriggerSeconds(0);
    setSelectedTarget(null); setSelectedProperty(null); setSelectedIntegrationIds([]);
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
    } catch (err) { console.error('Failed to delete logger', err); }
  };

  const formatConditionValue = (conditionType: string, value: ConditionValue): string => {
    if (conditionType === 'range') { const r = value as RangeConditionValue; return `${r?.min ?? '?'} - ${r?.max ?? '?'}`; }
    if (conditionType === 'in') { const i = value as InConditionValue; return (i?.values || []).join(', '); }
    return String((value as SingleConditionValue)?.value ?? '');
  };

  // ===================== INTEGRATION FORM STATE =====================
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);
  const [intName, setIntName] = useState('');
  const [intType, setIntType] = useState<'slack' | 'teams' | 'discord' | 'webhook'>('slack');
  const [intWebhookUrl, setIntWebhookUrl] = useState('');
  const [intUrl, setIntUrl] = useState('');
  const [intHeaders, setIntHeaders] = useState('');
  const [intSendAll, setIntSendAll] = useState(false);

  const resetIntForm = () => {
    setIntName(''); setIntType('slack'); setIntWebhookUrl(''); setIntUrl(''); setIntHeaders(''); setIntSendAll(false);
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = intType === 'webhook'
        ? { url: intUrl, headers: intHeaders ? JSON.parse(intHeaders) : undefined }
        : { webhookUrl: intWebhookUrl };

      await api.post('alerts/integrations', {
        json: { name: intName, type: intType, config, sendAllAlerts: intSendAll, enabled: true },
      });
      setShowIntegrationForm(false);
      resetIntForm();
      fetchData();
    } catch (err) {
      console.error('Failed to create integration', err);
    }
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

  // Selectable integrations for trigger form (exclude sendAllAlerts ones)
  const selectableIntegrations = integrations.filter(i => !i.sendAllAlerts && i.enabled);

  const toggleIntegrationSelection = (id: string) => {
    setSelectedIntegrationIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  // Get integration names by IDs
  const getIntegrationNames = (ids?: string[]): string[] => {
    if (!ids?.length) return [];
    return ids.map(id => integrations.find(i => i.id === id)?.name).filter(Boolean) as string[];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Settings size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">Alerts Configuration</h1>
        </div>
      </header>

      {/* Tabs */}
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

      {/* ===================== TRIGGERS TAB ===================== */}
      {activeTab === 'triggers' && (
        <>
          <div className="flex justify-end mb-6">
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">
              <Plus size={18} />
              New Alert Trigger
            </button>
          </div>

          {showForm && (
            <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Activity size={20} className="text-[var(--accent)]" />
                Create Alert Trigger
              </h2>
              <form onSubmit={handleCreateTrigger} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Trigger Name</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Node CPU" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Target Type</label>
                  <select required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    value={targetType} onChange={handleTargetTypeChange}>
                    <option value="" disabled>Select a target type</option>
                    {targets.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                  </select>
                </div>

                {selectedTarget && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Property</label>
                      <select required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                        value={targetProperty} onChange={handlePropertyChange}>
                        <option value="" disabled>Select a property</option>
                        {selectedTarget.properties.map(p => (
                          <option key={p.name} value={p.name}>{p.label} {p.unit ? `(${p.unit})` : ''}</option>
                        ))}
                      </select>
                      {selectedProperty?.description && <p className="text-xs text-slate-500 mt-1">{selectedProperty.description}</p>}
                    </div>

                    {selectedProperty && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-400">Condition</label>
                          <select required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                            value={conditionType} onChange={handleConditionTypeChange}>
                            <option value="" disabled>Select condition</option>
                            {selectedProperty.supportedConditionTypes.map(ct => (
                              <option key={ct} value={ct}>
                                {ct === 'eq' ? 'Equals' : ct === 'neq' ? 'Not Equals' : ct === 'gt' ? 'Greater Than' :
                                 ct === 'gte' ? 'Greater Than or Equal' : ct === 'lt' ? 'Less Than' :
                                 ct === 'lte' ? 'Less Than or Equal' : ct === 'range' ? 'Range' :
                                 ct === 'in' ? 'In List' : ct}
                              </option>
                            ))}
                          </select>
                        </div>
                        {conditionType && <div className="md:col-span-2">{renderConditionValueInput()}</div>}
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Scope</label>
                      <select required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                        value={scope} onChange={e => { setScope(e.target.value); setScopeValue(''); }}>
                        {getScopeOptions().map(sc => <option key={sc} value={sc}>{sc.replace(/^[a-z]/, (c) => c.toUpperCase())}</option>)}
                      </select>
                    </div>

                    {scope !== 'cluster' && (
                      <div className="space-y-2">
                        <label className="text-sm text-slate-400">Target Value</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                          value={scopeValue} onChange={e => setScopeValue(e.target.value)}>
                          <option value="">All {scope}s</option>
                          {getScopeValueOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Advanced options */}
                    <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Advanced Options</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-400">Lookback (seconds)</label>
                          <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                            value={lookbackSeconds} onChange={e => setLookbackSeconds(parseInt(e.target.value) || 0)} placeholder="0 = no lookback" />
                          <p className="text-xs text-slate-500">Condition must match for the past X seconds</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-400">No Retrigger (seconds)</label>
                          <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                            value={noRetriggerSeconds} onChange={e => setNoRetriggerSeconds(parseInt(e.target.value) || 0)} placeholder="0 = always retrigger" />
                          <p className="text-xs text-slate-500">Cooldown before same trigger fires again</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-400">Auto-Resolve Lookback (seconds)</label>
                          <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                            value={autoResolveLookbackSeconds} onChange={e => setAutoResolveLookbackSeconds(parseInt(e.target.value) || 0)} placeholder="0 = use trigger lookback" />
                          <p className="text-xs text-slate-500">Condition must not match for this period to auto-resolve</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={autoResolveEnabled} onChange={e => setAutoResolveEnabled(e.target.checked)} />
                          <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                        <span className="text-sm text-slate-400">Enable auto-resolve</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <label className="text-sm text-slate-400">Custom Message Template (optional)</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                          value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)}
                          placeholder='e.g. {targetType} {targetId} has {property} = {value}' />
                        <p className="text-xs text-slate-500">Variables: {'{targetType}'}, {'{targetId}'}, {'{property}'}, {'{value}'}, {'{threshold}'}, {'{conditionType}'}</p>
                      </div>
                    </div>

                    {/* Integration selection */}
                    {selectableIntegrations.length > 0 && (
                      <div className="md:col-span-2 border-t border-white/10 pt-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Notify Integrations</h3>
                        <div className="flex flex-wrap gap-3">
                          {selectableIntegrations.map(int => (
                            <button
                              key={int.id}
                              type="button"
                              onClick={() => toggleIntegrationSelection(int.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                                selectedIntegrationIds.includes(int.id)
                                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                              }`}
                            >
                              {getIntegrationIcon(int.type)}
                              {int.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity">Save Trigger</button>
                </div>
              </form>
            </section>
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
                  // Also show sendAllAlerts integrations
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

                      {/* Integration badges */}
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

      {/* ===================== INTEGRATIONS TAB ===================== */}
      {activeTab === 'integrations' && (
        <>
          <div className="flex justify-end mb-6">
            <button onClick={() => setShowIntegrationForm(!showIntegrationForm)}
              className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">
              <Plus size={18} />
              New Integration
            </button>
          </div>

          {showIntegrationForm && (
            <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Bell size={20} className="text-[var(--accent)]" />
                Create Integration
              </h2>
              <form onSubmit={handleCreateIntegration} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Integration Name</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    value={intName} onChange={e => setIntName(e.target.value)} placeholder="e.g. Team Slack" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Type</label>
                  <select required className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    value={intType} onChange={e => setIntType(e.target.value as any)}>
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>

                {intType !== 'webhook' ? (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm text-slate-400">Webhook URL</label>
                    <input required type="url" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={intWebhookUrl} onChange={e => setIntWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                  </div>
                ) : (
                  <>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm text-slate-400">Webhook URL</label>
                      <input required type="url" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                        value={intUrl} onChange={e => setIntUrl(e.target.value)} placeholder="https://hooks.example.com/..." />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm text-slate-400">Custom Headers (JSON, optional)</label>
                      <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                        value={intHeaders} onChange={e => setIntHeaders(e.target.value)} placeholder='{"X-API-Key": "your-key"}' />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={intSendAll} onChange={e => setIntSendAll(e.target.checked)} />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                  <div>
                    <span className="text-sm text-slate-400">Send all alerts</span>
                    <p className="text-xs text-slate-500">This integration will receive <strong>all</strong> alerts automatically, without per-trigger selection</p>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button type="button" onClick={() => { setShowIntegrationForm(false); resetIntForm(); }}
                    className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity">Save Integration</button>
                </div>
              </form>
            </section>
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
                      <button onClick={() => deleteIntegration(int.id)} title="Delete Integration"
                        className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30">
                        <Trash2 size={18} />
                      </button>
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