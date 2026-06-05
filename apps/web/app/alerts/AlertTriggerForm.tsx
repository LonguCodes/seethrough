'use client';

import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, MessageSquare, Bell, Webhook } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import api from '../../lib/api';

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

interface AlertIntegration {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'discord' | 'webhook';
  config: Record<string, unknown>;
  sendAllAlerts: boolean;
  enabled: boolean;
}

const conditionValueSchema = z.object({
  type: z.enum(['single', 'range', 'in']),
  singleValue: z.union([z.string(), z.number()]).optional(),
  rangeMin: z.number().optional(),
  rangeMax: z.number().optional(),
  inValues: z.array(z.union([z.string(), z.number()])).optional(),
});

const schema = z.object({
  name: z.string().min(1, 'Trigger name is required'),
  targetType: z.string().min(1, 'Target type is required'),
  targetProperty: z.string().min(1, 'Property is required'),
  conditionType: z.string().min(1, 'Condition is required'),
  conditionValue: conditionValueSchema,
  scope: z.string().min(1, 'Scope is required'),
  scopeValue: z.string().optional(),
  messageTemplate: z.string().optional(),
  lookbackSeconds: z.number().min(0),
  autoResolveEnabled: z.boolean(),
  autoResolveLookbackSeconds: z.number().min(0),
  noRetriggerSeconds: z.number().min(0),
  selectedIntegrationIds: z.array(z.string()),
});

export type AlertTriggerFormValues = z.infer<typeof schema>;

interface AlertTriggerFormProps {
  targets: TargetSchema[];
  integrations: AlertIntegration[];
  clusterInfo: { nodes: unknown[]; namespaces: { name: string }[]; pods: { name: string; namespace: string }[]; pvcs: { name: string; namespace: string }[] };
  latestMetrics: { machineId: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

function getIntegrationIcon(type: string) {
  switch (type) {
    case 'discord': return <MessageSquare size={20} />;
    case 'slack': return <Bell size={20} />;
    case 'teams': return <Bell size={20} />;
    case 'webhook': return <Webhook size={20} />;
    default: return <Bell size={20} />;
  }
}

function conditionLabel(ct: string): string {
  const labels: Record<string, string> = {
    eq: 'Equals', neq: 'Not Equals', gt: 'Greater Than',
    gte: 'Greater Than or Equal', lt: 'Less Than',
    lte: 'Less Than or Equal', range: 'Range', in: 'In List',
  };
  return labels[ct] ?? ct;
}

export default function AlertTriggerForm({ targets, integrations, clusterInfo, latestMetrics, onSuccess, onCancel }: AlertTriggerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AlertTriggerFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      targetType: '',
      targetProperty: '',
      conditionType: '',
      conditionValue: { type: 'single' },
      scope: '',
      scopeValue: '',
      messageTemplate: '',
      lookbackSeconds: 0,
      autoResolveEnabled: true,
      autoResolveLookbackSeconds: 0,
      noRetriggerSeconds: 0,
      selectedIntegrationIds: [],
    },
  });

  const targetType = useWatch({ control, name: 'targetType' });
  const targetProperty = useWatch({ control, name: 'targetProperty' });
  const conditionType = useWatch({ control, name: 'conditionType' });
  const conditionValue = useWatch({ control, name: 'conditionValue' });
  const scope = useWatch({ control, name: 'scope' });
  const selectedIntegrationIds = useWatch({ control, name: 'selectedIntegrationIds' });
  const autoResolveEnabled = useWatch({ control, name: 'autoResolveEnabled' });

  const selectedTarget = useMemo(() => targets.find((t) => t.type === targetType) || null, [targets, targetType]);
  const selectedProperty = useMemo(
    () => selectedTarget?.properties.find((p) => p.name === targetProperty) || null,
    [selectedTarget, targetProperty],
  );

  const selectableIntegrations = useMemo(
    () => integrations.filter((i) => !i.sendAllAlerts && i.enabled),
    [integrations],
  );

  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('targetType', val);
    setValue('targetProperty', '');
    setValue('conditionType', '');
    setValue('conditionValue', { type: 'single' });
    setValue('scope', 'cluster');
    setValue('scopeValue', '');
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('targetProperty', val);
    setValue('conditionType', '');
    setValue('conditionValue', { type: 'single' });
    const prop = selectedTarget?.properties.find((p) => p.name === val) || null;
    if (prop) setValue('conditionType', prop.supportedConditionTypes[0] || '');
  };

  const handleConditionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('conditionType', e.target.value);
    setValue('conditionValue', { type: 'single' });
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
    if (scope === 'namespace') return clusterInfo.namespaces.map((ns) => ({ value: ns.name, label: ns.name }));
    if (scope === 'node') return latestMetrics.map((m) => ({ value: m.machineId, label: m.machineId }));
    if (scope === 'pod') return clusterInfo.pods.filter(Boolean).map((pod) => ({ value: pod.name, label: `${pod.namespace}/${pod.name}` }));
    if (scope === 'pvc') return (clusterInfo.pvcs || []).map((pvc) => ({ value: pvc.name, label: `${pvc.namespace}/${pvc.name}` }));
    return [];
  };

  const toggleIntegrationSelection = (id: string) => {
    if (selectedIntegrationIds.includes(id)) {
      setValue('selectedIntegrationIds', selectedIntegrationIds.filter((x) => x !== id));
    } else {
      setValue('selectedIntegrationIds', [...selectedIntegrationIds, id]);
    }
  };

  const buildApiConditionValue = (ct: string, cv: AlertTriggerFormValues['conditionValue']) => {
    if (ct === 'range') return { min: cv.rangeMin ?? 0, max: cv.rangeMax ?? 0 };
    if (ct === 'in') return { values: cv.inValues ?? [] };
    return cv.singleValue;
  };

  const onSubmit = async (values: AlertTriggerFormValues) => {
    const conditionValue = buildApiConditionValue(values.conditionType, values.conditionValue);
    await api.post('alerts/triggers', {
      json: {
        name: values.name,
        targetType: values.targetType,
        targetProperty: values.targetProperty,
        conditionType: values.conditionType,
        conditionValue,
        scope: values.scope,
        scopeValue: values.scopeValue || null,
        messageTemplate: values.messageTemplate || null,
        enabled: true,
        lookbackSeconds: values.lookbackSeconds,
        autoResolveEnabled: values.autoResolveEnabled,
        autoResolveLookbackSeconds: values.autoResolveLookbackSeconds,
        noRetriggerSeconds: values.noRetriggerSeconds,
        integrationIds: values.selectedIntegrationIds,
      },
    });
    onSuccess();
  };

  return (
    <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Activity size={20} className="text-[var(--accent)]" />
        Create Alert Trigger
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Trigger Name</label>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="e.g. High Node CPU"
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Target Type</label>
          <select
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
            value={targetType}
            onChange={handleTargetTypeChange}
          >
            <option value="" disabled>Select a target type</option>
            {targets.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          {errors.targetType && <p className="text-xs text-red-400">{errors.targetType.message}</p>}
        </div>

        {selectedTarget && (
          <>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Property</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                value={targetProperty}
                onChange={handlePropertyChange}
              >
                <option value="" disabled>Select a property</option>
                {selectedTarget.properties.map((p) => (
                  <option key={p.name} value={p.name}>{p.label} {p.unit ? `(${p.unit})` : ''}</option>
                ))}
              </select>
              {selectedProperty?.description && <p className="text-xs text-slate-500 mt-1">{selectedProperty.description}</p>}
            </div>

            {selectedProperty && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Condition</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    value={conditionType}
                    onChange={handleConditionTypeChange}
                  >
                    <option value="" disabled>Select condition</option>
                    {selectedProperty.supportedConditionTypes.map((ct) => (
                      <option key={ct} value={ct}>{conditionLabel(ct)}</option>
                    ))}
                  </select>
                </div>
                {conditionType && <div className="md:col-span-2">{renderConditionValue()}</div>}
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Scope</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                value={scope}
                onChange={(e) => { setValue('scope', e.target.value); setValue('scopeValue', ''); }}
              >
                {getScopeOptions().map((sc) => <option key={sc} value={sc}>{sc.replace(/^[a-z]/, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>

            {scope !== 'cluster' && (
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Target Value</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  {...register('scopeValue')}
                >
                  <option value="">All {scope}s</option>
                  {getScopeValueOptions().map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
                    {...register('lookbackSeconds', { valueAsNumber: true })} placeholder="0 = no lookback" />
                  <p className="text-xs text-slate-500">Condition must match for the past X seconds</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">No Retrigger (seconds)</label>
                  <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    {...register('noRetriggerSeconds', { valueAsNumber: true })} placeholder="0 = always retrigger" />
                  <p className="text-xs text-slate-500">Cooldown before same trigger fires again</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Auto-Resolve Lookback (seconds)</label>
                  <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    {...register('autoResolveLookbackSeconds', { valueAsNumber: true })} placeholder="0 = use trigger lookback" />
                  <p className="text-xs text-slate-500">Condition must not match for this period to auto-resolve</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" {...register('autoResolveEnabled')} />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
                <span className="text-sm text-slate-400">Enable auto-resolve</span>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-sm text-slate-400">Custom Message Template (optional)</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  {...register('messageTemplate')}
                  placeholder='e.g. {targetType} {targetId} has {property} = {value}' />
                <p className="text-xs text-slate-500">Variables: {'{targetType}'}, {'{targetId}'}, {'{property}'}, {'{value}'}, {'{threshold}'}, {'{conditionType}'}</p>
              </div>
            </div>

            {/* Integration selection */}
            {selectableIntegrations.length > 0 && (
              <div className="md:col-span-2 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Notify Integrations</h3>
                <div className="flex flex-wrap gap-3">
                  {selectableIntegrations.map((int) => (
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
          <button type="button" onClick={onCancel}
            className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity">Save Trigger</button>
        </div>
      </form>
    </section>
  );

  function renderConditionValue() {
    if (!selectedProperty) return null;
    const { type, enumValues, unit } = selectedProperty;

    if (type === 'enum' && enumValues) {
      if (conditionType === 'in') {
        return (
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Select values (hold Ctrl/Cmd for multiple)</label>
            <select multiple className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors h-32"
              value={(conditionValue?.inValues || []).map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                setValue('conditionValue', { type: 'in', inValues: selected });
              }}>
              {enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Value</label>
          <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
            value={conditionValue?.singleValue ?? ''}
            onChange={(e) => setValue('conditionValue', { type: 'single', singleValue: e.target.value })}>
            <option value="">Select a value</option>
            {enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
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
              value={conditionValue?.rangeMin ?? ''}
              onChange={(e) => setValue('conditionValue', { type: 'range', rangeMin: parseFloat(e.target.value) || 0, rangeMax: conditionValue?.rangeMax ?? 0 })}
              placeholder="Minimum" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Max {unit ? `(${unit})` : ''}</label>
            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
              value={conditionValue?.rangeMax ?? ''}
              onChange={(e) => setValue('conditionValue', { type: 'range', rangeMin: conditionValue?.rangeMin ?? 0, rangeMax: parseFloat(e.target.value) || 0 })}
              placeholder="Maximum" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Value {unit ? `(${unit})` : ''}</label>
        <input type={type === 'number' ? 'number' : 'text'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
          value={conditionValue?.singleValue ?? ''}
          onChange={(e) => setValue('conditionValue', { type: 'single', singleValue: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
          placeholder="Enter value" />
      </div>
    );
  }
}