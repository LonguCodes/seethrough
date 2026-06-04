'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Settings, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface MfaConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const MFA_TYPES: Record<string, string> = {
  totp: 'Authenticator App (TOTP)',
  email: 'Email Code',
  passkey: 'Passkey / WebAuthn',
};

const EMPTY_SETTINGS: Record<string, any> = {
  totp: {
    type: 'totp',
    issuer: 'SeeThrough',
    digits: 6,
    period: 30,
  },
  email: {
    type: 'email',
    from: 'noreply@seethrough.dev',
    subject: 'Your SeeThrough verification code',
    ttl: 300,
  },
  passkey: {
    type: 'passkey',
    relyingPartyId: '',
    relyingPartyName: 'SeeThrough',
    userVerification: 'preferred' as const,
  },
};

export default function MfaConfigsPage() {
  const [configs, setConfigs] = useState<MfaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'totp', enabled: true, settings: {} as Record<string, any> });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchConfigs = async () => {
    try {
      const data: any = await api.get('mfa-configs').json();
      setConfigs(data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to manage MFA configurations.');
      } else {
        setError('Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const payload = {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      settings: form.settings,
    };

    try {
      if (editingId) {
        await api.patch(`mfa-configs/${editingId}`, { json: payload });
      } else {
        await api.post('mfa-configs', { json: payload });
      }
      setShowForm(false);
      setEditingId(null);
      fetchConfigs();
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

  const handleEdit = (c: MfaConfig) => {
    setForm({
      name: c.name,
      type: c.type,
      enabled: c.enabled,
      settings: { ...c.settings },
    });
    setEditingId(c.id);
    setShowForm(true);
    setFormError('');
  };

  const handleNew = () => {
    const type = 'totp';
    setForm({
      name: '',
      type,
      enabled: true,
      settings: { ...EMPTY_SETTINGS[type] },
    });
    setEditingId(null);
    setShowForm(true);
    setFormError('');
  };

  const handleChangeType = (type: string) => {
    setForm({ ...form, type, settings: { ...EMPTY_SETTINGS[type] } });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete MFA config "${name}"?`)) return;
    try { await api.delete(`mfa-configs/${id}`); fetchConfigs(); } catch { alert('Failed to delete'); }
  };

  const handleToggle = async (c: MfaConfig) => {
    try { await api.patch(`mfa-configs/${c.id}`, { json: { enabled: !c.enabled } }); fetchConfigs(); } catch { alert('Failed to toggle'); }
  };

  const renderSettingsForm = () => {
    const s = form.settings;
    const setSettings = (partial: Record<string, any>) => setForm({ ...form, settings: { ...form.settings, ...partial, type: form.type } });

    switch (form.type) {
      case 'totp':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">TOTP Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Issuer</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.issuer || 'SeeThrough'} onChange={e => setSettings({ issuer: e.target.value })} />
                <p className="text-xs text-slate-500">Shown in authenticator app</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Digits</label>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.digits || 6} onChange={e => setSettings({ digits: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Period (seconds)</label>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.period || 30} onChange={e => setSettings({ period: +e.target.value })} />
              </div>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Email Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">From Address</label>
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.from || ''} onChange={e => setSettings({ from: e.target.value })} placeholder="noreply@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Subject</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.subject || ''} onChange={e => setSettings({ subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Code TTL (seconds)</label>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.ttl || 300} onChange={e => setSettings({ ttl: +e.target.value })} />
              </div>
            </div>
          </div>
        );
      case 'passkey':
        return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Passkey Settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Relying Party ID</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.relyingPartyId || ''} onChange={e => setSettings({ relyingPartyId: e.target.value })} placeholder="seethrough.local" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Relying Party Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={s.relyingPartyName || 'SeeThrough'} onChange={e => setSettings({ relyingPartyName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">User Verification</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] appearance-none" value={s.userVerification || 'preferred'} onChange={e => setSettings({ userVerification: e.target.value })}>
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                  <option value="discouraged">Discouraged</option>
                </select>
              </div>
            </div>
          </div>
        );
    }
  };

  if (error && loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <header className="flex items-center gap-4 mb-12">
          <Shield size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">MFA Configuration</h1>
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
          <h1 className="text-4xl text-gradient">MFA Configuration</h1>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl">
          <Plus size={18} /> Add MFA Method
        </button>
      </header>

      {showForm && (
        <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Settings size={20} className="text-[var(--accent)]" />
            {editingId ? 'Edit MFA Method' : 'New MFA Method'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Display Name</label>
                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Google Authenticator" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Type</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] appearance-none" value={form.type} onChange={e => handleChangeType(e.target.value)}>
                  {Object.entries(MFA_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {renderSettingsForm()}

            {formError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormError(''); }} className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
              <button type="submit" disabled={formLoading} className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50">{formLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
          <Settings size={24} className="text-[var(--accent)]" />
          Configured MFA Methods
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
            <Shield size={48} className="text-slate-600" />
            <p className="text-slate-400 max-w-md">No MFA methods configured. Add one to enable multi-factor authentication.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map(c => (
              <div key={c.id} className="glass rounded-2xl overflow-hidden border border-white/5">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleToggle(c)} title={c.enabled ? 'Disable' : 'Enable'}>
                        {c.enabled ? <ToggleRight size={28} className="text-[var(--success)]" /> : <ToggleLeft size={28} className="text-slate-500" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider font-medium">{MFA_TYPES[c.type] || c.type}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Created: {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(c)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Settings size={18} />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="p-2 rounded-xl transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pl-12">
                    <pre className="p-2 bg-black/30 rounded-lg text-xs text-slate-400 font-mono overflow-x-auto">{JSON.stringify(c.settings, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}