'use client';

import { useEffect, useState } from 'react';
import { Users, Trash2, Shield, Eye, UserPlus, AlertCircle, Copy, Check, Link2 } from 'lucide-react';
import api from '../../lib/api';

interface User {
  id: string;
  username: string;
  role: string;
}

interface InvitationResult {
  token: string;
  username: string;
  role: string;
  expiresAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Invitation link state
  const [invitation, setInvitation] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    try {
      const data: any = await api.get('users').json();
      setUsers(data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to manage users.');
      } else {
        setError('Failed to load users.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const data: any = await api.post('users', {
        json: { username: newUsername, role: newRole },
      }).json();
      setInvitation(data);
      setCopied(false);
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setFormError(data.message || 'Failed to create invitation');
      } else {
        setFormError('Failed to create invitation');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const getInviteLink = (token: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/invite/${token}`;
    }
    return `/invite/${token}`;
  };

  const handleCopyLink = async () => {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(getInviteLink(invitation.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCloseInvitation = () => {
    setInvitation(null);
    setShowForm(false);
    setNewUsername('');
    setNewRole('viewer');
    setFormError('');
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`users/${userId}`, {
        json: { role: newRole },
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.delete(`users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        alert(data.message || 'Failed to delete user');
      } else {
        alert('Failed to delete user');
      }
    }
  };

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <header className="flex items-center gap-4 mb-12">
          <Users size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">User Management</h1>
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
          <Users size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">User Management</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setInvitation(null); setCopied(false); }}
          className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
        >
          <UserPlus size={18} />
          Invite User
        </button>
      </header>

      {/* Invite User Form / Invitation Link */}
      {showForm && (
        <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
          {!invitation ? (
            <>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <UserPlus size={20} className="text-[var(--accent)]" />
                Invite New User
              </h2>
              <form onSubmit={handleInviteUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Username</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Role</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formError && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="md:col-span-2 flex justify-end gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(''); }}
                    className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {formLoading ? 'Creating...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Link2 size={20} className="text-[var(--success)]" />
                Invitation Created
              </h2>
              <div className="space-y-6">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Username</div>
                    <div className="text-sm font-medium text-slate-200">{invitation.username}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Role</div>
                    <div className="text-sm font-medium text-slate-200 capitalize">{invitation.role}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Expires</div>
                    <div className="text-sm font-medium text-slate-200">{new Date(invitation.expiresAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Invitation Link</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap select-all">
                      {getInviteLink(invitation.token)}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        copied
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20'
                      }`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Share this link with the user. They will be able to set their password and activate their account.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCloseInvitation}
                    className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Users Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
          <Shield size={24} className="text-[var(--accent)]" />
          Registered Users
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
            <Users size={48} className="text-slate-600" />
            <p className="text-slate-400 max-w-md">No users found.</p>
          </div>
        ) : (
          <div className="glass rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Username</th>
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Role</th>
                  <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-200">{user.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer hover:bg-white/5"
                      >
                        <option value="admin" className="bg-slate-900">Admin</option>
                        <option value="viewer" className="bg-slate-900">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        title="Delete user"
                        className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
