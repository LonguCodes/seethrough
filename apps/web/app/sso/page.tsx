'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Settings, Trash2, ToggleLeft, ToggleRight, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../lib/api';

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

const EMPTY_FORM = {
  name: '',
  type: 'oidc' as 'saml' | 'oidc',
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
  const [configs, setConfigs] = useState<SsoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        enabled: form.enabled,
        allowOnlySso: form.allowOnlySso,
        autoCreateUsers: form.autoCreateUsers,
        defaultRole: form.defaultRole,
      };

      if (form.type === 'saml') {
        payload.samlEntryPoint = form.samlEntryPoint || undefined;
        payload.samlIssuer = form.samlIssuer || undefined;
        payload.samlCert = form.samlCert || undefined;
      } else {
        payload.oidcIssuerUrl = form.oidcIssuerUrl || undefined;
        payload.oidcClientId = form.oidcClientId || undefined;
        if (form.oidcClientSecret) {
          payload.oidcClientSecret = form.oidcClientSecret;
        }
      }

      if (editingId) {
        await api.patch(`sso/${editingId}`, { json: payload });
      } else {
        await api.post('sso', { json: payload });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchConfigs();
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setFormError(data.message || 'Failed to save SSO configuration');
      } else {
        setFormError('Failed to save SSO configuration');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (config: SsoConfig) => {
    setForm({
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
    setFormError('');
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
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); setFormError(''); }}
          className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
        >
          <Plus size={18} />
          Add SSO Config
        </button>
      </header>

      {/* Form */}
      {showForm && (
        <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Plus size={20} className="text-[var(--accent)]" />
            {editingId ? 'Edit SSO Configuration' : 'New SSO Configuration'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Display Name</label>
                <input
                  required
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Company Okta"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Type</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as 'saml' | 'oidc' })}
                >
                  <option value="oidc">OpenID Connect (OIDC)</option>
                  <option value="saml">SAML 2.0</option>
                </select>
              </div>
            </div>

            {/* Protocol-specific fields */}
            {form.type === 'saml' ? (
              <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-slate-500 uppercase tracking-widest">SAML Configuration</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Entry Point (IdP URL)</label>
                    <input
                      required
                      type="url"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={form.samlEntryPoint}
                      onChange={e => setForm({ ...form, samlEntryPoint: e.target.value })}
                      placeholder="https://idp.example.com/sso/saml"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Issuer (SP Entity ID)</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={form.samlIssuer}
                      onChange={e => setForm({ ...form, samlIssuer: e.target.value })}
                      placeholder="seethrough-sp"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">X.509 Certificate (optional)</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors font-mono text-xs"
                    value={form.samlCert}
                    onChange={e => setForm({ ...form, samlCert: e.target.value })}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
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
                      required
                      type="url"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={form.oidcIssuerUrl}
                      onChange={e => setForm({ ...form, oidcIssuerUrl: e.target.value })}
                      placeholder="https://accounts.google.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Client ID</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={form.oidcClientId}
                      onChange={e => setForm({ ...form, oidcClientId: e.target.value })}
                      placeholder="your-client-id"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Client Secret {editingId ? '(leave blank to keep current)' : ''}</label>
                  <input
                    type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    value={form.oidcClientSecret}
                    onChange={e => setForm({ ...form, oidcClientSecret: e.target.value })}
                    placeholder={editingId ? '••••••••' : 'your-client-secret'}
                    required={!editingId}
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
                    onClick={() => setForm({ ...form, autoCreateUsers: !form.autoCreateUsers })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.autoCreateUsers ? 'bg-[var(--accent)]' : 'bg-white/10'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.autoCreateUsers ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                  <div>
                    <p className="text-sm text-slate-200">Allow Only SSO Users</p>
                    <p className="text-xs text-slate-500">Disable local login when this is active</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, allowOnlySso: !form.allowOnlySso })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.allowOnlySso ? 'bg-[var(--warning)]' : 'bg-white/10'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.allowOnlySso ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Default Role for Auto-Created Users</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  value={form.defaultRole}
                  onChange={e => setForm({ ...form, defaultRole: e.target.value })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setFormError(''); }}
                className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Configs List */}
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