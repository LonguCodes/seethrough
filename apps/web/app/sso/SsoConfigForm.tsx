'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import api from '../../lib/api';

const baseSchema = z.object({
  name: z.string().min(1, 'Display name is required'),
  type: z.enum(['saml', 'oidc']),
  enabled: z.boolean(),
  allowOnlySso: z.boolean(),
  autoCreateUsers: z.boolean(),
  defaultRole: z.string().min(1, 'Default role is required'),
  samlEntryPoint: z.string().optional(),
  samlIssuer: z.string().optional(),
  samlCert: z.string().optional(),
  oidcIssuerUrl: z.string().optional(),
  oidcClientId: z.string().optional(),
  oidcClientSecret: z.string().optional(),
});

const schema = baseSchema.superRefine((data, ctx) => {
  if (data.type === 'saml') {
    if (!data.samlEntryPoint || data.samlEntryPoint.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Entry Point is required', path: ['samlEntryPoint'] });
    }
    if (!data.samlIssuer || data.samlIssuer.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Issuer is required', path: ['samlIssuer'] });
    }
  } else {
    if (!data.oidcIssuerUrl || data.oidcIssuerUrl.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Issuer URL is required', path: ['oidcIssuerUrl'] });
    }
    if (!data.oidcClientId || data.oidcClientId.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Client ID is required', path: ['oidcClientId'] });
    }
  }
});

export type SsoConfigFormValues = z.infer<typeof schema>;

interface SsoConfigFormProps {
  editingId: string | null;
  defaultValues: SsoConfigFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SsoConfigForm({ editingId, defaultValues, onSuccess, onCancel }: SsoConfigFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<SsoConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const type = useWatch({ control, name: 'type' });
  const autoCreateUsers = useWatch({ control, name: 'autoCreateUsers' });
  const allowOnlySso = useWatch({ control, name: 'allowOnlySso' });
  const typeValue = type;

  const onSubmit = async (values: SsoConfigFormValues) => {
    setLoading(true);
    setError('');
    try {
      const payload: any = {
        name: values.name,
        type: values.type,
        enabled: values.enabled,
        allowOnlySso: values.allowOnlySso,
        autoCreateUsers: values.autoCreateUsers,
        defaultRole: values.defaultRole,
      };

      if (values.type === 'saml') {
        payload.samlEntryPoint = values.samlEntryPoint || undefined;
        payload.samlIssuer = values.samlIssuer || undefined;
        payload.samlCert = values.samlCert || undefined;
      } else {
        payload.oidcIssuerUrl = values.oidcIssuerUrl || undefined;
        payload.oidcClientId = values.oidcClientId || undefined;
        if (values.oidcClientSecret) {
          payload.oidcClientSecret = values.oidcClientSecret;
        }
      }

      if (editingId) {
        await api.patch(`sso/${editingId}`, { json: payload });
      } else {
        await api.post('sso', { json: payload });
      }

      onSuccess();
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setError(data.message || 'Failed to save SSO configuration');
      } else {
        setError('Failed to save SSO configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Plus size={20} className="text-[var(--accent)]" />
        {editingId ? 'Edit SSO Configuration' : 'New SSO Configuration'}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Display Name</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="e.g., Company Okta"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Type</label>
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
              value={typeValue}
              onChange={(e) => setValue('type', e.target.value as 'saml' | 'oidc')}
            >
              <option value="oidc">OpenID Connect (OIDC)</option>
              <option value="saml">SAML 2.0</option>
            </select>
            {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
          </div>
        </div>

        {/* Protocol-specific fields */}
        {type === 'saml' ? (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">SAML Configuration</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Entry Point (IdP URL)</label>
                <input
                  type="url"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  {...register('samlEntryPoint')}
                  placeholder="https://idp.example.com/sso/saml"
                />
                {errors.samlEntryPoint && <p className="text-xs text-red-400">{errors.samlEntryPoint.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Issuer (SP Entity ID)</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  {...register('samlIssuer')}
                  placeholder="seethrough-sp"
                />
                {errors.samlIssuer && <p className="text-xs text-red-400">{errors.samlIssuer.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">X.509 Certificate (optional)</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors font-mono text-xs"
                {...register('samlCert')}
                placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">OpenID Connect Configuration</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Issuer URL</label>
                <input
                  type="url"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  {...register('oidcIssuerUrl')}
                  placeholder="https://accounts.google.com"
                />
                {errors.oidcIssuerUrl && <p className="text-xs text-red-400">{errors.oidcIssuerUrl.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Client ID</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  {...register('oidcClientId')}
                  placeholder="your-client-id"
                />
                {errors.oidcClientId && <p className="text-xs text-red-400">{errors.oidcClientId.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Client Secret {editingId ? '(leave blank to keep current)' : ''}</label>
              <input
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                {...register('oidcClientSecret')}
                placeholder={editingId ? '••••••••' : 'your-client-secret'}
              />
            </div>
          </div>
        )}

        {/* Common settings */}
        <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">User Settings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
              <div>
                <p className="text-sm text-slate-200">Auto-Create Users</p>
                <p className="text-xs text-slate-500">Automatically create user accounts on first SSO login</p>
              </div>
              <button
                type="button"
                onClick={() => setValue('autoCreateUsers', !autoCreateUsers)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoCreateUsers ? 'bg-[var(--accent)]' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoCreateUsers ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
              <div>
                <p className="text-sm text-slate-200">Allow Only SSO Users</p>
                <p className="text-xs text-slate-500">Disable local login when this is active</p>
              </div>
              <button
                type="button"
                onClick={() => setValue('allowOnlySso', !allowOnlySso)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  allowOnlySso ? 'bg-[var(--warning)]' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowOnlySso ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Default Role for Auto-Created Users</label>
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
              {...register('defaultRole')}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </section>
  );
}