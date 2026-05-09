'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, Plus, Trash2, Power, PowerOff, Activity } from 'lucide-react';

interface Strategy {
  type: string;
  targetType: string;
  supportedScopes: string[];
  requiredParameters: string[];
  allParameters: string[];
  unit?: string;
}

interface AlertTrigger {
  id: string;
  name: string;
  scope: string;
  scopeValue?: string;
  type: string;
  parameters: Record<string, any>;
  enabled: boolean;
  createdAt: string;
}

export default function AlertsConfiguration() {
  const apiUrl = '/api/proxy';
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<{ nodes: any[], namespaces: any[], pods: any[], pvcs: any[] }>({ nodes: [], namespaces: [], pods: [], pvcs: [] });
  const [latestMetrics, setLatestMetrics] = useState<any[]>([]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [scope, setScope] = useState('');
  const [scopeValue, setScopeValue] = useState('');
  const [parameters, setParameters] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stratsRes, triggersRes, clusterRes, metricsRes] = await Promise.all([
        fetch(`${apiUrl}/alerts/strategies`),
        fetch(`${apiUrl}/alerts/triggers`),
        fetch(`${apiUrl}/cluster-info`),
        fetch(`${apiUrl}/metrics/latest`)
      ]);
      const stratsData = await stratsRes.json();
      const triggersData = await triggersRes.json();
      const clusterData = await clusterRes.json();
      const metricsData = await metricsRes.json();

      setStrategies(stratsData);
      setTriggers(triggersData);
      setClusterInfo(clusterData);
      setLatestMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch configuration data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setType(val);
    const strat = strategies.find(s => s.type === val);
    if (strat) {
      setScope(strat.supportedScopes[0] || '');
      const initParams: Record<string, string> = {};
      const combinedParams = Array.from(new Set([...(strat.allParameters || []), ...(strat.requiredParameters || [])]));
      combinedParams.forEach(p => { initParams[p] = ''; });
      setParameters(initParams);
    } else {
      setScope('');
      setParameters({});
    }
  };

  const handleCreateTrigger = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert numeric strings to numbers if needed (e.g. threshold)
    const parsedParams: Record<string, any> = {};
    for (const [key, val] of Object.entries(parameters)) {
      parsedParams[key] = isNaN(Number(val)) ? val : Number(val);
    }

    try {
      const resp = await fetch(`${apiUrl}/alerts/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          scope,
          scopeValue: scopeValue || null,
          parameters: parsedParams,
          enabled: true,
        }),
      });

      if (resp.ok) {
        setShowForm(false);
        setName('');
        setScopeValue('');
        setType('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create trigger', err);
    }
  };

  const toggleTrigger = async (id: string, currentlyEnabled: boolean) => {
    try {
      await fetch(`${apiUrl}/alerts/triggers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled: !currentlyEnabled } : t));
    } catch (err) {
      console.error('Failed to toggle trigger', err);
    }
  };

  const deleteTrigger = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await fetch(`${apiUrl}/alerts/triggers/${id}`, {
        method: 'DELETE',
      });
      setTriggers(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete logger', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Settings size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">Alerts Configuration</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
          >
            <Plus size={18} />
            New Alert Trigger
          </button>
        </div>
      </header>

      {showForm && (
        <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-[var(--accent)]" />
            Create Alert Trigger
          </h2>
          <form onSubmit={handleCreateTrigger} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Trigger Name</label>
              <input
                required
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. High Node CPU"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Strategy Type</label>
              <select
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                value={type}
                onChange={handleTypeChange}
              >
                <option value="" disabled>Select a strategy</option>
                {strategies.map(s => <option key={s.type} value={s.type}>{s.type.replaceAll('_', ' ').replace(/^[a-z]/, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>

            {type && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Scope</label>
                  <select
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                  >
                    {strategies.find(s => s.type === type)?.supportedScopes.map(sc => (
                      <option key={sc} value={sc}>{sc.replace(/^[a-z]/, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Target Value (Optional)</label>
                  {scope === 'cluster' ? (
                    <input
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-500 outline-none cursor-not-allowed"
                      value="N/A (Cluster Scope)"
                    />
                  ) : (
                    <select
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                      value={scopeValue}
                      onChange={e => setScopeValue(e.target.value)}
                    >
                      <option value="">Select a target (or leave for all)</option>
                      {scope === 'namespace' && clusterInfo.namespaces.map(ns => (
                        <option key={ns.name} value={ns.name}>{ns.name}</option>
                      ))}
                      {scope === 'node' && latestMetrics.map(m => (
                        <option key={m.machineId} value={m.machineId}>{m.machineId}</option>
                      ))}
                      {scope === 'pod' && clusterInfo.pods.map(pod => (
                        <option key={`${pod.namespace}/${pod.name}`} value={pod.name}>{pod.namespace}/{pod.name}</option>
                      ))}
                      {scope === 'pvc' && (clusterInfo.pvcs || []).map(pvc => (
                        <option key={`${pvc.namespace}/${pvc.name}`} value={pvc.name}>{pvc.namespace}/{pvc.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {Array.from(new Set([...(strategies.find(s => s.type === type)?.allParameters || []), ...(strategies.find(s => s.type === type)?.requiredParameters || [])])).map(param => {
                  const strat = strategies.find(s => s.type === type);
                  const isRequired = strat?.requiredParameters.includes(param);
                  return (
                  <div key={param} className="space-y-2 md:col-span-2">
                    <label className="text-sm text-slate-400 capitalize">
                      {param}
                      {strat?.unit && <span className="ml-1 text-[var(--accent)] opacity-70">({strat.unit})</span>}
                      {isRequired ? '' : ' (Optional)'}
                    </label>
                    <div className="relative">
                      <input
                        required={isRequired}
                        type="text"
                        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors ${strat?.unit ? 'pr-12' : ''}`}
                        value={parameters[param] || ''}
                        onChange={e => setParameters({ ...parameters, [param]: e.target.value })}
                        placeholder={`Enter ${param}`}
                      />
                      {strat?.unit && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono pointer-events-none">
                          {strat.unit}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </>
            )}

            <div className="md:col-span-2 flex justify-end gap-4 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity"
              >
                Save Trigger
              </button>
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">
            {triggers.map(trigger => (
              <div key={trigger.id} className={`glass p-6 rounded-3xl transition-all ${trigger.enabled ? 'border-[var(--accent)]/30 shadow-[0_4px_20px_0_var(--accent-glow)]' : 'opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-200">{trigger.name}</h3>
                    <p className="text-xs text-slate-400 flex gap-2 mt-1">
                      <span className="uppercase text-[var(--accent)] font-medium">{trigger.type}</span>
                      &bull;
                      <span className="capitalize">{trigger.scope}</span>
                      {trigger.scopeValue && <span className="opacity-80">({trigger.scopeValue})</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTrigger(trigger.id, trigger.enabled)}
                      title={trigger.enabled ? "Disable Alert" : "Enable Alert"}
                      className={`p-2 rounded-xl transition-colors ${trigger.enabled ? 'bg-[var(--success-glow)] text-[var(--success)] hover:bg-[var(--success)]/30' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {trigger.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    <button
                      onClick={() => deleteTrigger(trigger.id)}
                      title="Delete Alert"
                      className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mt-6">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Parameters</h4>
                  {Object.entries(trigger.parameters).map(([k, v]) => {
                    const strat = strategies.find(s => s.type === trigger.type);
                    return (
                      <div key={k} className="flex justify-between items-center text-sm mb-2 last:mb-0 text-slate-300">
                        <span className="capitalize text-slate-400">{k}</span>
                        <span className="font-mono bg-black/40 px-2 py-0.5 rounded">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          {strat?.unit && <span className="ml-1 opacity-50">{strat.unit}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
