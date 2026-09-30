import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserRound, X } from 'lucide-react';
import { api } from '../services/api';
import { DashboardUser } from '../types';

const emptyForm = { name: '', email: '', password: '', role: 'OPERATOR', isActive: true };

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [editing, setEditing] = useState<DashboardUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api.getUsers().then(setUsers).catch(err => setError(err.message));
  useEffect(() => { load(); }, []);

  const showCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setOpen(true); };
  const showEdit = (user: DashboardUser) => { setEditing(user); setForm({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive }); setError(''); setOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.updateUser(editing.id, { ...form, password: form.password || undefined });
      else await api.createUser(form);
      setOpen(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save user'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-semibold">Users</h2><p className="text-xs text-slate-500">Manage accounts that own screens and media.</p></div>
      <button onClick={showCreate} className="flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Add User</button>
    </div>
    {error && !open && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{users.map(user => <tr key={user.id}><td className="p-4"><div className="flex items-center gap-3"><div className="rounded-full bg-sky-50 p-2 text-sky-600"><UserRound className="h-4 w-4" /></div><div><div className="font-medium">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></div></div></td><td className="p-4 text-xs">{user.role}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.isActive ? 'Active' : 'Disabled'}</span></td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => showEdit(user)} className="p-2 text-slate-500 hover:text-sky-600"><Pencil className="h-4 w-4" /></button>{user.role !== 'ADMIN' && <button onClick={async () => { if (confirm(`Delete ${user.name}?`)) { try { await api.deleteUser(user.id); load(); } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); } } }} className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"><div className="flex justify-between"><div><h3 className="font-semibold">{editing ? 'Edit user' : 'Add user'}</h3><p className="text-xs text-slate-500">Users see only their assigned screens and media.</p></div><button type="button" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div>{error && <div className="rounded bg-red-50 p-3 text-xs text-red-700">{error}</div>}<input required placeholder="Name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} className="w-full rounded-lg border p-2.5 text-sm"/><input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} className="w-full rounded-lg border p-2.5 text-sm"/><input required={!editing} type="password" minLength={6} placeholder={editing ? 'New password (optional)' : 'Password (min. 6 characters)'} value={form.password} onChange={e => setForm({...form, password:e.target.value})} className="w-full rounded-lg border p-2.5 text-sm"/><select value={form.role} disabled={editing?.role === 'ADMIN'} onChange={e => setForm({...form, role:e.target.value})} className="w-full rounded-lg border p-2.5 text-sm"><option value="OPERATOR">Operator</option><option value="VIEWER">Viewer</option>{editing?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} disabled={editing?.role === 'ADMIN'} onChange={e => setForm({...form,isActive:e.target.checked})}/>Active account</label><button disabled={saving} className="w-full rounded-lg bg-sky-600 p-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save User'}</button></form></div>}
  </div>;
};
