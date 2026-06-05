'use client';

import { useEffect, useState, useCallback } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Plus, Settings, Trash2, ToggleLeft, ToggleRight, AlertCircle, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

import api from '../../lib/api';

interface MfaConfigRef {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface AuthMethod {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  autoCreateUsers: boolean;
  defaultRole: string;
  settings: Record<string, any>;
  mfaConfig: MfaConfigRef | null;
  createdAt: string;
  updatedAt: string;
}

const METHOD_TYPES: Record<string, string> = {
  password: 'Password',
  oidc: 'OpenID Connect',
  saml: 'SAML 2.0',
};

const EMPTY_SETTINGS: Record<string, any> = {
  password: { type: 'password', minPasswordLength: 8, requireComplexity: false },
  oidc: { type: 'oidc', issuerUrl: '', clientId: '', clientSecret: '', redirectUri: '', scopes: ['openid', 'profile', 'email'] },
  saml: { type: 'saml', entryPoint: '', issuer: '', cert: '' },
};

export default function AuthMethodsPage() {
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [mfaConfigs, setMfaConfigs] = useState<MfaConfigRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'password', enabled: true, autoCreateUsers: false, defaultRole: 'viewer', settings: {} as Record<string, any>, mfaConfigId: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [methodsData, mfaData]: [any, any] = await Promise.all([
        api.get('auth-methods').json(),
        api.get('mfa-configs').json().catch(() => []),
      ]);
      setMethods(methodsData);
      setMfaConfigs(mfaData);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to manage auth methods.');
      } else {
        setError('Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sortedMethods = [...methods].sort((a, b) => a.priority - b.priority);
  const enabledMethods = methods.filter(m => m.enabled);
  const isOnlyMethod = methods.length <= 1;
  const isOnlyEnabled = enabledMethods.length <= 1;
  const hasPasswordMethod = methods.some(m => m.type === 'password');

  const persistPriorities = useCallback(async (items: AuthMethod[]) => {
    try {
      await Promise.all(
        items.map((item) =>
          api.patch(`auth-methods/${item.id}`, { json: { priority: item.priority } }),
        ),
      );
    } catch {
      fetchData();
    }
  }, []);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const items = [...sortedMethods];
    const [moved] = items.splice(dragIndex, 1);
    if (!moved) return;
    items.splice(index, 0, moved!);

    const reordered = items.map((item, i) => ({ ...item, priority: i }));
    setMethods(reordered);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    const items = [...methods].sort((a, b) => a.priority - b.priority);
    persistPriorities(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const payload: Record<string, any> = {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      autoCreateUsers: form.autoCreateUsers,
      defaultRole: form.defaultRole,
      settings: form.settings,
      mfaConfigId: form.mfaConfigId || null,
    };

    try {
      if (editingId) {
        await api.patch(`auth-methods/${editingId}`, { json: payload });
      } else {
        await api.post('auth-methods', { json: { ...payload, priority: methods.length } });
      }
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setFormError(data.message || 'Failed to save');
      } else {
        setFormError('Failed to save');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (m: AuthMethod) => {
    setForm({
      name: m.name,
      type: m.type,
      enabled: m.enabled,
      autoCreateUsers: m.autoCreateUsers,
      defaultRole: m.defaultRole,
      settings: { ...m.settings },
      mfaConfigId: m.mfaConfig?.id || '',
    });
    setEditingId(m.id);
    setShowForm(true);
    setFormError('');
  };

  const handleNew = () => {
    const type = 'password';
    setForm({
      name: '', type, enabled: true,
      autoCreateUsers: false, defaultRole: 'viewer',
      settings: { ...EMPTY_SETTINGS[type] },
      mfaConfigId: '',
    });
    setEditingId(null);
    setShowForm(true);
    setFormError('');
  };

  const handleChangeType = (type: string) => {
    setForm({ ...form, type, settings: { ...EMPTY_SETTINGS[type] } });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete auth method "${name}"?`)) return;
    try { await api.delete(`auth-methods/${id}`); fetchData(); } catch { alert('Failed to delete'); }
  };

  const handleToggle = async (m: AuthMethod) => {
    try { await api.patch(`auth-methods/${m.id}`, { json: { enabled: !m.enabled } }); fetchData(); } catch { alert('Failed to toggle'); }
  };

  const renderSettingsForm = () => {
    const s = form.settings;
    const setSettings = (partial: Record<string, any>) => setForm({ ...form, settings: { ...form.settings, ...partial, type: form.type } });

    switch (form.type) {
      case 'password':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Password Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Min Password Length</label>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.minPasswordLength || 8} onChange={e => setSettings({ minPasswordLength: +e.target.value })} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <div><p className="text-sm text-slate-200">Require Complexity</p><p className="text-xs text-slate-500">Mix of upper/lowercase, numbers, symbols</p></div>
                <button type="button" onClick={() => setSettings({ requireComplexity: !s.requireComplexity })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.requireComplexity ? 'bg-[var(--accent)]' : 'bg-white/10'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.requireComplexity ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        );
      case 'oidc':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">OpenID Connect Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-400">Issuer URL</label><input required type="url" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.issuerUrl || ''} onChange={e => setSettings({ issuerUrl: e.target.value })} placeholder="https://accounts.google.com" /></div>
              <div className="space-y-2"><label className="text-sm text-slate-400">Client ID</label><input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.clientId || ''} onChange={e => setSettings({ clientId: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-slate-400">Client Secret {editingId ? '(leave blank to keep)' : ''}</label><input type="password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.clientSecret || ''} onChange={e => setSettings({ clientSecret: e.target.value })} placeholder={editingId ? '••••••••' : 'secret'} required={!editingId} /></div>
          </div>
        );
      case 'saml':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">SAML Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-400">Entry Point</label><input required type="url" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.entryPoint || ''} onChange={e => setSettings({ entryPoint: e.target.value })} placeholder="https://idp.example.com/sso/saml" /></div>
              <div className="space-y-2"><label className="text-sm text-slate-400">Issuer (SP Entity ID)</label><input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.issuer || ''} onChange={e => setSettings({ issuer: e.target.value })} placeholder="seethrough-sp" /></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-slate-400">X.509 Certificate (optional)</label><textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] font-mono text-xs" value={s.cert || ''} onChange={e => setSettings({ cert: e.target.value })} placeholder="-----BEGIN CERTIFICATE-----" rows={3} /></div>
          </div>
        );
    }
  };

  if (error && loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <header className="flex items-center gap-4 mb-12"><Shield size={32} className="text-[var(--accent)]" /><h1 className="text-4xl text-gradient">Auth Methods</h1></header>
        <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6"><AlertCircle size={48} className="text-[var(--danger)]" /><p className="text-slate-400 max-w-md">{error}</p></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4"><Shield size={32} className="text-[var(--accent)]" /><h1 className="text-4xl text-gradient">Auth Methods</h1></div>
        <button onClick={handleNew} className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">Add Method</button>
      </header>

      {showForm && (
        <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Settings size={20} className="text-[var(--accent)]" />{editingId ? 'Edit Auth Method' : 'New Auth Method'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm text-slate-400">Display Name</label><input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Local Login" /></div>
              <div className="space-y-2"><label className="text-sm text-slate-400">Type</label><select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] appearance-none" value={form.type} onChange={e => handleChangeType(e.target.value)} disabled={editingId ? true : false}>{Object.entries(METHOD_TYPES).map(([k, v]) => <option key={k} value={k} disabled={k === 'password' && hasPasswordMethod && !editingId}>{v}</option>)}</select></div>
            </div>
            {renderSettingsForm()}
            <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">MFA Configuration</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">MFA Method (optional)</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] appearance-none"
                    value={form.mfaConfigId}
                    onChange={e => setForm({ ...form, mfaConfigId: e.target.value })}
                  >
                    <option value="">None (no MFA)</option>
                    {mfaConfigs.filter(c => c.enabled).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Default Role</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] appearance-none" value={form.defaultRole} onChange={e => setForm({ ...form, defaultRole: e.target.value })}>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <div><p className="text-sm text-slate-200">Auto-Create Users</p><p className="text-xs text-slate-500">Create accounts on first SSO login</p></div>
                <button type="button" onClick={() => setForm({ ...form, autoCreateUsers: !form.autoCreateUsers })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.autoCreateUsers ? 'bg-[var(--accent)]' : 'bg-white/10'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.autoCreateUsers ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            {formError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormError(''); }} className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
              <button type="submit" disabled={formLoading} className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50">{formLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3"><Settings size={24} className="text-[var(--accent)]" />Configured Methods</h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading...</div>
        ) : methods.length === 0 ? (
          <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6"><Shield size={48} className="text-slate-600" /><p className="text-slate-400 max-w-md">No auth methods configured. Add one to enable authentication.</p></div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
            {sortedMethods.map((m, index) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`glass rounded-2xl overflow-hidden border border-white/5 cursor-default ${dragIndex === index ? 'shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-500/30' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors" title="Drag to reorder">
                        <GripVertical size={20} />
                      </div>
                      <button onClick={() => handleToggle(m)} disabled={m.enabled && isOnlyEnabled} title={m.enabled && isOnlyEnabled ? 'Cannot disable the only enabled method' : m.enabled ? 'Disable' : 'Enable'}>
                        {m.enabled ? <ToggleRight size={28} className="text-[var(--success)]" /> : <ToggleLeft size={28} className="text-slate-500" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{m.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider font-medium">{METHOD_TYPES[m.type] || m.type}</span>
                          {m.mfaConfig && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] uppercase tracking-wider font-medium">MFA</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Auto-create: {m.autoCreateUsers ? `Yes (${m.defaultRole})` : 'No'}{m.mfaConfig ? ` · MFA: ${m.mfaConfig.name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        {expandedId === m.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button onClick={() => handleEdit(m)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><Settings size={18} /></button>
                      <button onClick={() => handleDelete(m.id, m.name)} disabled={isOnlyMethod} className={`p-2 rounded-xl transition-colors ${isOnlyMethod ? 'bg-white/[0.03] text-slate-600 cursor-not-allowed' : 'bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30'}`} title={isOnlyMethod ? 'Cannot delete the only method' : 'Delete'}><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-4">
                    <div>
                      <span className="text-xs text-slate-500">Settings:</span>
                      <pre className="mt-1 p-3 bg-black/30 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">{JSON.stringify(m.settings, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">MFA Method:</span>
                        {mfaConfigs.length > 0 && (
                          <select
                            className="text-xs bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-slate-300 outline-none"
                            value={m.mfaConfig?.id || ''}
                            onChange={async e => {
                              const val = e.target.value;
                              try {
                                await api.patch(`auth-methods/${m.id}`, { json: { mfaConfigId: val || null } });
                                fetchData();
                              } catch { alert('Failed to update MFA'); }
                            }}
                          >
                            <option value="">None (no MFA)</option>
                            {mfaConfigs.filter(c => c.enabled).map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {m.mfaConfig ? (
                        <div className="p-2 rounded-lg bg-white/[0.03] flex items-center gap-2">
                          <span className="text-sm text-slate-200">{m.mfaConfig.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">{m.mfaConfig.type}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No MFA linked</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}