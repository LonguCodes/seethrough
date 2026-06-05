'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bell } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import api from '../../lib/api';

const schema = z.object({
  name: z.string().min(1, 'Integration name is required'),
  type: z.enum(['slack', 'teams', 'discord', 'webhook']),
  webhookUrl: z.string().optional(),
  url: z.string().optional(),
  headers: z.string().optional(),
  sendAllAlerts: z.boolean(),
}).refine((data) => {
  if (data.type !== 'webhook') {
    return !!data.webhookUrl && data.webhookUrl.length > 0;
  }
  if (data.type === 'webhook') {
    return !!data.url && data.url.length > 0;
  }
  return true;
}, {
  message: 'Webhook URL is required',
  path: ['webhookUrl'],
}).refine((data) => {
  if (data.type === 'webhook') {
    return !!data.url && data.url.length > 0;
  }
  return true;
}, {
  message: 'URL is required',
  path: ['url'],
});

export type IntegrationFormValues = z.infer<typeof schema>;

interface IntegrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function IntegrationForm({ onSuccess, onCancel }: IntegrationFormProps) {
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<IntegrationFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      type: 'slack',
      webhookUrl: '',
      url: '',
      headers: '',
      sendAllAlerts: false,
    },
  });

  const intType = useWatch({ control, name: 'type' });

  const onSubmit = async (values: IntegrationFormValues) => {
    setError('');
    try {
      const config = values.type === 'webhook'
        ? { url: values.url, headers: values.headers ? JSON.parse(values.headers) : undefined }
        : { webhookUrl: values.webhookUrl };

      await api.post('alerts/integrations', {
        json: { name: values.name, type: values.type, config, sendAllAlerts: values.sendAllAlerts, enabled: true },
      });
      onSuccess();
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        setError(d.message || 'Failed to create integration');
      } else {
        setError('Failed to create integration');
      }
    }
  };

  return (
    <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Bell size={20} className="text-[var(--accent)]" />
        Create Integration
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Integration Name</label>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="e.g. Team Slack"
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Type</label>
          <select
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
            value={intType}
            onChange={(e) => setValue('type', e.target.value as IntegrationFormValues['type'])}
          >
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
            <option value="teams">Microsoft Teams</option>
            <option value="webhook">Webhook</option>
          </select>
          {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
        </div>

        {intType !== 'webhook' ? (
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm text-slate-400">Webhook URL</label>
            <input
              type="url"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
              {...register('webhookUrl')}
              placeholder="https://hooks.slack.com/services/..."
            />
            {errors.webhookUrl && <p className="text-xs text-red-400">{errors.webhookUrl.message}</p>}
          </div>
        ) : (
          <>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-400">Webhook URL</label>
              <input
                type="url"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                {...register('url')}
                placeholder="https://hooks.example.com/..."
              />
              {errors.url && <p className="text-xs text-red-400">{errors.url.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-400">Custom Headers (JSON, optional)</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)] transition-colors"
                {...register('headers')}
                placeholder='{"X-API-Key": "your-key"}'
              />
            </div>
          </>
        )}

        <div className="md:col-span-2 flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" {...register('sendAllAlerts')} />
            <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          </label>
          <div>
            <span className="text-sm text-slate-400">Send all alerts</span>
            <p className="text-xs text-slate-500">This integration will receive <strong>all</strong> alerts automatically, without per-trigger selection</p>
          </div>
        </div>

        {error && (
          <div className="md:col-span-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Integration'}
          </button>
        </div>
      </form>
    </section>
  );
}