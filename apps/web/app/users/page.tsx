'use client';

import { useEffect, useState } from 'react';
import { Users, Trash2, Shield, UserPlus, AlertCircle, Copy, Check, Link2, Plus, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../lib/use-auth';
import { hasPermission, PERMISSIONS, ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '../../lib/permissions';

interface RoleEntity {
  id: string;
  name: string;
  superadmin: boolean;
  permissions: string[];
}

interface User {
  id: string;
  username: string;
  role: RoleEntity | string;
}

interface InvitationResult {
  token: string;
  username: string;
  role: string;
  expiresAt: string;
}

type Tab = 'users' | 'roles';

export default function UsersPage() {
  const { user } = useAuth();
  const canManageUsers = hasPermission(user, PERMISSIONS.USERS_MANAGE);
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // --- users state ---
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // invite form
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // --- roles state ---
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleSuperadmin, setRoleSuperadmin] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleFormError, setRoleFormError] = useState('');
  const [roleFormLoading, setRoleFormLoading] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

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

  const fetchRoles = async () => {
    try {
      const data: any = await api.get('roles').json();
      setRoles(data);
    } catch {
      // optional
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const getRoleName = (u: User): string => {
    if (typeof u.role === 'object' && u.role !== null) {
      return u.role.name;
    }
    return u.role as string;
  };

  // --- Users handlers ---

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
        const d = await err.response.json();
        setFormError(d.message || 'Failed to create invitation');
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
    } catch { /* ignore */ }
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
      await api.patch(`users/${userId}`, { json: { role: newRole } });
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            if (typeof u.role === 'object' && u.role !== null) {
              return { ...u, role: { ...u.role, name: newRole } };
            }
            return { ...u, role: newRole };
          }
          return u;
        }),
      );
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.delete(`users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        alert(d.message || 'Failed to delete user');
      } else {
        alert('Failed to delete user');
      }
    }
  };

  // --- Roles handlers ---

  const resetRoleForm = () => {
    setRoleName('');
    setRoleSuperadmin(false);
    setRolePermissions([]);
    setEditingRoleId(null);
    setRoleFormError('');
  };

  const openCreateRole = () => {
    resetRoleForm();
    setShowRoleForm(true);
  };

  const openEditRole = (r: RoleEntity) => {
    setRoleName(r.name);
    setRoleSuperadmin(r.superadmin);
    setRolePermissions([...r.permissions]);
    setEditingRoleId(r.id);
    setShowRoleForm(true);
    setRoleFormError('');
  };

  const togglePerm = (perm: string) => {
    setRolePermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormLoading(true);
    setRoleFormError('');
    try {
      if (editingRoleId) {
        await api.patch(`roles/${editingRoleId}`, {
          json: { name: roleName, superadmin: roleSuperadmin, permissions: rolePermissions },
        });
      } else {
        await api.post('roles', {
          json: { name: roleName, superadmin: roleSuperadmin, permissions: rolePermissions },
        });
      }
      setShowRoleForm(false);
      resetRoleForm();
      fetchRoles();
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        setRoleFormError(d.message || 'Failed to save role');
      } else {
        setRoleFormError('Failed to save role');
      }
    } finally {
      setRoleFormLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;
    try {
      await api.delete(`roles/${roleId}`);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        alert(d.message || 'Failed to delete role');
      } else {
        alert('Failed to delete role');
      }
    }
  };

  if (error && loading) {
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
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Users size={32} className="text-[var(--accent)]" />
          <h1 className="text-4xl text-gradient">User Management</h1>
        </div>
        <div className="flex items-center gap-3">
          {canManageUsers && activeTab === 'users' && (
            <button
              onClick={() => { setShowForm(!showForm); setInvitation(null); setCopied(false); }}
              className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
            >
              <UserPlus size={18} />
              Invite User
            </button>
          )}
          {canManageUsers && activeTab === 'roles' && (
            <button
              onClick={openCreateRole}
              className="flex items-center gap-2 text-sm text-white bg-[var(--accent)] hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
            >
              <Plus size={18} />
              Create Role
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'users' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users size={16} className="inline mr-2" />
          Users
        </button>
        {canManageUsers && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'roles' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={16} className="inline mr-2" />
            Roles & Permissions
          </button>
        )}
      </div>

      {/* ===================== USERS TAB ===================== */}
      {activeTab === 'users' && (
        <>
          {/* Invite User Form */}
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
                      <input required type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                        value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Enter username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">Role</label>
                      <select
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                        value={newRole} onChange={e => setNewRole(e.target.value)}
                      >
                        {roles.length > 0
                          ? roles.map(r => (
                              <option key={r.id} value={r.name}>{r.name}{r.superadmin ? ' (superadmin)' : ''}</option>
                            ))
                          : (
                            <>
                              <option value="superadmin">superadmin</option>
                              <option value="viewer">viewer</option>
                            </>
                          )}
                      </select>
                    </div>
                    {formError && (
                      <div className="md:col-span-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>
                    )}
                    <div className="md:col-span-2 flex justify-end gap-4 mt-2">
                      <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
                        className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                      <button type="submit" disabled={formLoading}
                        className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50">
                        {formLoading ? 'Creating...' : 'Create Invitation'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Link2 size={20} className="text-[var(--success)]" /> Invitation Created
                  </h2>
                  <div className="space-y-6">
                    <div className="flex gap-6">
                      <div><div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Username</div><div className="text-sm font-medium text-slate-200">{invitation.username}</div></div>
                      <div><div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Role</div><div className="text-sm font-medium text-slate-200 capitalize">{invitation.role}</div></div>
                      <div><div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Expires</div><div className="text-sm font-medium text-slate-200">{new Date(invitation.expiresAt).toLocaleDateString()}</div></div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Invitation Link</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap select-all">{getInviteLink(invitation.token)}</div>
                        <button onClick={handleCopyLink}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20'}`}>
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">Share this link with the user. They will be able to set their password and activate their account.</p>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleCloseInvitation} className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity">Done</button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Users Table */}
          <section>
            <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <Shield size={24} className="text-[var(--accent)]" /> Registered Users
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
                      {canManageUsers && (
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const rn = getRoleName(u);
                      return (
                        <tr key={u.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4"><span className="text-sm font-medium text-slate-200">{u.username}</span></td>
                          <td className="px-6 py-4">
                            {canManageUsers ? (
                              <select value={rn} onChange={e => handleRoleChange(u.id, e.target.value)}
                                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer hover:bg-white/5">
                                {roles.length > 0
                                  ? roles.map(r => (<option key={r.id} value={r.name} className="bg-slate-900">{r.name}{r.superadmin ? ' (superadmin)' : ''}</option>))
                                  : (<><option value="superadmin" className="bg-slate-900">superadmin</option><option value="viewer" className="bg-slate-900">viewer</option></>)}
                              </select>
                            ) : (
                              <span className="text-xs font-medium text-slate-300 capitalize">{rn}</span>
                            )}
                          </td>
                          {canManageUsers && (
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDelete(u.id, u.username)} title="Delete user"
                                className="p-2 rounded-xl transition-colors bg-[var(--danger-glow)] text-[var(--danger)] hover:bg-[var(--danger)]/30">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ===================== ROLES TAB ===================== */}
      {activeTab === 'roles' && (
        <>
          {/* Role Create/Edit Form */}
          {showRoleForm && (
            <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Settings size={20} className="text-[var(--accent)]" />
                {editingRoleId ? 'Edit Role' : 'Create Role'}
              </h2>
              <form onSubmit={handleSaveRole} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Role Name</label>
                    <input required type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
                      value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. operator" />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={roleSuperadmin} onChange={e => { setRoleSuperadmin(e.target.checked); if (e.target.checked) setRolePermissions(ALL_PERMISSIONS); }} />
                      <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative" />
                      <div>
                        <span className="text-sm text-slate-200">Superadmin</span>
                        <p className="text-xs text-slate-500">Grants all permissions automatically</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto bg-black/20 rounded-xl p-4 border border-white/5">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          rolePermissions.includes(perm) ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <input type="checkbox" className="accent-[var(--accent)]"
                          checked={rolePermissions.includes(perm)}
                          onChange={() => togglePerm(perm)}
                          disabled={roleSuperadmin} />
                        <span className="text-xs text-slate-300 select-none">{PERMISSION_LABELS[perm as Permission] ?? perm}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {roleFormError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{roleFormError}</div>
                )}

                <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => { setShowRoleForm(false); resetRoleForm(); }}
                    className="px-6 py-2 rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" disabled={roleFormLoading}
                    className="px-6 py-2 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50">
                    {roleFormLoading ? 'Saving...' : editingRoleId ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Roles List */}
          <section>
            <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <Settings size={24} className="text-[var(--accent)]" /> Configured Roles
            </h2>
            {roles.length === 0 ? (
              <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6">
                <Shield size={48} className="text-slate-600" />
                <p className="text-slate-400 max-w-md">No roles configured yet. Click "Create Role" above to add one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roles.map((r) => (
                  <div key={r.id} className="glass rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setExpandedRoleId(expandedRoleId === r.id ? null : r.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                            {expandedRoleId === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{r.name}</h3>
                              {r.superadmin && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 uppercase tracking-wider font-medium">Superadmin</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {r.permissions.length} permission{r.permissions.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditRole(r)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Edit">
                            <Settings size={18} />
                          </button>
                          <button onClick={() => handleDeleteRole(r.id, r.name)}
                            className="p-2 rounded-xl transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedRoleId === r.id && (
                      <div className="px-6 pb-6 border-t border-white/5 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {ALL_PERMISSIONS.map((perm) => (
                            <div key={perm}
                              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                                r.permissions.includes(perm) ? 'text-[var(--success)] bg-[var(--success)]/5' : 'text-slate-600 bg-white/[0.02]'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${r.permissions.includes(perm) ? 'bg-[var(--success)]' : 'bg-slate-600'}`} />
                              {PERMISSION_LABELS[perm as Permission] ?? perm}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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