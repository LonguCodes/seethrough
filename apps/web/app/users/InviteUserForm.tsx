'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import api from '../../lib/api';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  role: z.string().min(1, 'Role is required'),
});

export type InviteUserFormValues = z.infer<typeof schema>;

export interface InvitationResult {
  token: string;
  username: string;
  role: string;
  expiresAt: string;
}

interface InviteUserFormProps {
  roles: { id: string; name: string; superadmin: boolean }[];
  onSuccess: (invitation: InvitationResult) => void;
  onCancel: () => void;
}

export default function InviteUserForm({ roles, onSuccess, onCancel }: InviteUserFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      role: 'viewer',
    },
  });

  const onSubmit = async (values: InviteUserFormValues) => {
    setLoading(true);
    setError('');
    try {
      const data: any = await api.post('users', {
        json: { username: values.username, role: values.role },
      }).json();
      onSuccess(data);
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        setError(d.message || 'Failed to create invitation');
      } else {
        setError('Failed to create invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <UserPlus size={20} className="text-[var(--accent)]" />
        Invite New User
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Username</label>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Enter username"
            {...register('username')}
          />
          {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Role</label>
          <select
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors appearance-none"
            {...register('role')}
          >
            {roles.length > 0
              ? roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}{r.superadmin ? ' (superadmin)' : ''}
                  </option>
                ))
              : (
                <>
                  <option value="superadmin">superadmin</option>
                  <option value="viewer">viewer</option>
                </>
              )}
          </select>
          {errors.role && <p className="text-xs text-red-400">{errors.role.message}</p>}
        </div>

        {error && (
          <div className="md:col-span-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-4 mt-2">
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
            {loading ? 'Creating...' : 'Create Invitation'}
          </button>
        </div>
      </form>
    </section>
  );
}