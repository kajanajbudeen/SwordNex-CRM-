import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Mail, CheckCircle2, UserCheck } from 'lucide-react';
import { apiClient } from '../../api/client';

export const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'USER',
    title: 'Account Executive',
  });

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/organizations/members');
      if (res.success) setMembers(res.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/organizations/members/invite', form);
      if (res.success) {
        setShowInviteModal(false);
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          role: 'AGENT',
          title: 'Account Executive',
        });
        fetchMembers();
      }
    } catch (err: any) {
      alert(`Invite error: ${err.message}`);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ADMIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Team Members & Role-Based Access Control</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {members.length} Members
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage authorized workspace personnel, roles, and granular security boundaries.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Member Name</th>
              <th className="py-3 px-4">Email Address</th>
              <th className="py-3 px-4">Workspace Role</th>
              <th className="py-3 px-4">Job Title</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                  Loading members...
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                        {m.user.firstName.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-100">
                        {m.user.firstName} {m.user.lastName}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{m.user.email}</td>

                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${getRoleBadge(m.role)}`}>
                      {m.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">{m.title || 'Team Member'}</td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center text-emerald-400 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                      Active
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Invite Team Member</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="colleague@swordnex.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Role & Permissions</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                >
                  <option value="USER">User — Lead, deal, contact, & task management</option>
                  <option value="ADMIN">Admin — Workspace settings, workflows, & billing</option>
                  <option value="SUPER_ADMIN">Super Admin — Complete platform governance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
