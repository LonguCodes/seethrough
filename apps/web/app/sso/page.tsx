'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Settings, Trash2, ToggleLeft, ToggleRight, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../lib/use-auth';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import { useRequirePermission } from '../../lib/use-require-permission';
import PageLoading from '../components/PageLoading';
import AccessDenied from '../components/AccessDenied';
import SsoConfigForm from './SsoConfigForm';
import type { SsoConfigFormValues } from './SsoConfigForm';

interface SsoConfig {
  id: string;
  name: string;
  type: 'saml' | 'oidc';
  enabled: boolean;
  allowOnlySso: boolean;
  autoCreateUsers: boolean;
  defaultRole: string;
  samlEntryPoint?: string;
  samlIssuer?: string;
  samlCert?: string;
  oidcIssuerUrl?: string;
  oidcClientId?: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM: SsoConfigFormValues = {
  name: '',
  type: 'oidc',
  enabled: true,
  allowOnlySso: false,
  autoCreateUsers: false,
  defaultRole: 'viewer',
  samlEntryPoint: '',
  samlIssuer: '',
  samlCert: '',
  oidcIssuerUrl: '',
  oidcClientId: '',
  oidcClientSecret: '',
};

export default function SsoPage() {
  const { authorized, loading: authLoading } = useRequirePermission(PERMISSIONS.SSO_VIEW);
  const { user } = useAuth();
  const canManageSso = hasPermission(user, PERMISSIONS.SSO_MANAGE);
  const [configs, setConfigs] = useState<SsoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDefaultValues, setFormDefaultValues] = useState<SsoConfigFormValues>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const data: any = await api.get('sso').json();
      setConfigs(data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to manage SSO configurations.');
      } else {
        setError('Failed to load SSO configurations.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEdit = (config: SsoConfig) => {
    setFormDefaultValues({
      name: config.name,
      type: config.type,
      enabled: config.enabled,
      allowOnlySso: config.allowOnlySso,
      autoCreateUsers: config.autoCreateUsers,
      defaultRole: config.defaultRole,
      samlEntryPoint: config.samlEntryPoint || '',
      samlIssuer: config.samlIssuer || '',
      samlCert: '',
      oidcIssuerUrl: config.oidcIssuerUrl || '',
      oidcClientId: config.oidcClientId || '',
      oidcClientSecret: '',
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete SSO configuration "${name}"?`)) return;
    try {
      await api.delete(`sso/${id}`);
      fetchConfigs();
    } catch (err: any) {
      alert('Failed to delete SSO configuration');
    }
  };

  const handleToggle = async (config: SsoConfig) => {
    try {
      await api.patch(`sso/${config.id}`, { json: { enabled: !config.enabled } });
      fetchConfigs();
    } catch (err) {
      alert('Failed to toggle SSO configuration');
    }
  };

  const formatType = (type: string) => {
    return type === 'oidc' ? 'OpenID Connect' : 'SAML';
  };

  if (authLoading) return <PageLoading />;

  if (!authorized) {
    return <AccessDenied title="SSO Configuration" icon={<Shield size={32} className="text-[var(--accent)]" />} />;
  }

  if (error && loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <header className="flex items-center gap-4 mb-12">
          <Shield size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">SSO Configuration</h1>
        </header>
        <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
          <AlertCircle size={48} className="text-[var(--danger)]" />
          <p className="text-slate-400 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Shield size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">SSO Configuration</h1>
        </div>
        {canManageSso && (
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormDefaultValues(EMPTY_FORM); }}
            className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
          >
            <Plus size={18} />
            Add SSO Config
          </button>
        )}
      </header>

      {showForm && (
        <SsoConfigForm
          editingId={editingId}
          defaultValues={formDefaultValues}
          onSuccess={() => {
            setShowForm(false);
            setEditingId(null);
            setFormDefaultValues(EMPTY_FORM);
            fetchConfigs();
          }}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
          <Settings size={24} className="text-[var(--accent)]" />
          Configured SSO Providers
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
            <Shield size={48} className="text-slate-600" />
            <p className="text-slate-400 max-w-md">No SSO configurations found. Add one to enable single sign-on.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map(config => (
              <div key={config.id} className="glass rounded-2xl overflow-hidden border border-white/5">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {canManageSso ? (
                        <button
                          onClick={() => handleToggle(config)}
                          className="transition-colors"
                          title={config.enabled ? 'Disable' : 'Enable'}
                        >
                          {config.enabled ? (
                            <ToggleRight size={28} className="text-[var(--success)]" />
                          ) : (
                            <ToggleLeft size={28} className="text-slate-500" />
                          )}
                        </button>
                      ) : (
                        <span>
                          {config.enabled ? (
                            <ToggleRight size={28} className="text-[var(--success)]" />
                          ) : (
                            <ToggleLeft size={28} className="text-slate-500" />
                          )}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider font-medium">
                            {formatType(config.type)}
                          </span>
                          {config.allowOnlySso && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] uppercase tracking-wider font-medium">
                              SSO Only
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Auto-create: {config.autoCreateUsers ? `Yes (default: ${config.defaultRole})` : 'No'}
                          {' · '}Created: {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === config.id ? null : config.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {expandedId === config.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {canManageSso && (
                        <>
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Edit"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id, config.name)}
                            className="p-2 rounded-xl transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {expandedId === config.id && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-3">
                    {config.type === 'saml' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Entry Point:</span>
                            <p className="text-slate-300 font-mono mt-0.5 break-all">{config.samlEntryPoint || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Issuer:</span>
                            <p className="text-slate-300 font-mono mt-0.5 break-all">{config.samlIssuer || '—'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Callback URL:</span>
                          <p className="text-slate-300 font-mono text-xs mt-0.5 break-all">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/proxy/auth/sso/callback/{config.id}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Issuer URL:</span>
                            <p className="text-slate-300 font-mono mt-0.5 break-all">{config.oidcIssuerUrl || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Client ID:</span>
                            <p className="text-slate-300 font-mono mt-0.5 break-all">{config.oidcClientId || '—'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Redirect URI:</span>
                          <p className="text-slate-300 font-mono text-xs mt-0.5 break-all">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/proxy/auth/sso/callback/{config.id}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}