'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings } from 'lucide-react';
import api from '../../lib/api';
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '../../lib/permissions';

const schema = z.object({
  name: z.string().min(1, 'Role name is required'),
  superadmin: z.boolean(),
  permissions: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof schema>;

interface RoleFormProps {
  editingRoleId: string | null;
  defaultValues: RoleFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RoleForm({ editingRoleId, defaultValues, onSuccess, onCancel }: RoleFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const superadmin = watch('superadmin');
  const permissions = watch('permissions');

  const togglePerm = (perm: string) => {
    const current = watch('permissions');
    if (current.includes(perm)) {
      setValue('permissions', current.filter((p) => p !== perm));
    } else {
      setValue('permissions', [...current, perm]);
    }
  };

  const onSubmit = async (values: RoleFormValues) => {
    setLoading(true);
    setError('');
    try {
      if (editingRoleId) {
        await api.patch(`roles/${editingRoleId}`, {
          json: { name: values.name, superadmin: values.superadmin, permissions: values.permissions },
        });
      } else {
        await api.post('roles', {
          json: { name: values.name, superadmin: values.superadmin, permissions: values.permissions },
        });
      }
      onSuccess();
    } catch (err: any) {
      if (err.response) {
        const d = await err.response.json();
        setError(d.message || 'Failed to save role');
      } else {
        setError('Failed to save role');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-12 glass p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Settings size={20} className="text-[var(--accent)]" />
        {editingRoleId ? 'Edit Role' : 'Create Role'}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Role Name</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="e.g. operator"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('superadmin', {
                  onChange: (e) => {
                    if (e.target.checked) {
                      setValue('permissions', ALL_PERMISSIONS);
                    }
                  },
                })}
              />
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
              <label
                key={perm}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  permissions.includes(perm)
                    ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePerm(perm)}
                  disabled={superadmin}
                />
                <span className="text-xs text-slate-300 select-none">
                  {PERMISSION_LABELS[perm as Permission] ?? perm}
                </span>
              </label>
            ))}
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
            {loading ? 'Saving...' : editingRoleId ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </form>
    </section>
  );
}