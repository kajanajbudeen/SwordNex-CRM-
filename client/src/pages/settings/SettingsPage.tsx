import React, { useState, useEffect } from 'react';
import { Settings, Shield, History, Building, CheckCircle2, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from '../../components/common/PasswordInput';

export const SettingsPage: React.FC = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SECURITY' | 'AUDIT'>('GENERAL');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [orgForm, setOrgForm] = useState({
    name: currentOrg?.name || '',
    domain: currentOrg?.domain || '',
  });

  useEffect(() => {
    if (currentOrg) {
      setOrgForm({
        name: currentOrg.name,
        domain: currentOrg.domain || '',
      });
    }
  }, [currentOrg]);

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get('/audit/logs');
      if (res.success) setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.patch('/organizations/current', orgForm);
      if (res.success) {
        alert('Organization settings updated successfully');
        refreshProfile();
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (pwdForm.newPassword.length < 8) {
      setPwdMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      if (res.success) {
        setPwdMessage({
          type: 'success',
          text: 'Password updated successfully! All other active sessions have been invalidated.',
        });
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdMessage({ type: 'error', text: res.message || 'Failed to update password.' });
      }
    } catch (err: any) {
      setPwdMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update password.',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <span>Organization Governance & Audit Trail</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            SOC-2 READY
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure multi-tenant organization parameters, compliance policies, and inspect immutable audit logs.
        </p>
      </div>

      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'GENERAL'
              ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          General Workspace Settings
        </button>
        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'SECURITY'
              ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Security & Password
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'AUDIT'
              ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Security Audit Trail
        </button>
      </div>

      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-400" />
              <span>Workspace Profile</span>
            </h3>

            <form onSubmit={handleUpdateOrg} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Corporate Domain</label>
                <input
                  type="text"
                  value={orgForm.domain}
                  onChange={(e) => setOrgForm({ ...orgForm, domain: e.target.value })}
                  placeholder="company.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
                >
                  Save Organization Settings
                </button>
              </div>
            </form>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Security & Multi-Tenant Boundary Policies</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-100">PostgreSQL Tenant Isolation</span>
                  <span className="text-[11px] text-slate-400">
                    All CRM entities bound strictly to organizationId with zero cross-tenant leakages.
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-100">AI Prompt Injection Defense</span>
                  <span className="text-[11px] text-slate-400">
                    Gateway validates inputs, strips harmful escape patterns, and gates external actions.
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-100">Immutable Audit Logging</span>
                  <span className="text-[11px] text-slate-400">
                    Every create, update, delete, login, and agent approval is recorded immutably.
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SECURITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Change Account Password</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your current password followed by your new password. Changing your password securely hashes it with bcrypt and immediately revokes all other active sessions across devices.
            </p>

            {pwdMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  pwdMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {pwdMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{pwdMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Current Password</label>
                <PasswordInput
                  id="settings-current-password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  placeholder="Enter current password..."
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">New Password</label>
                <PasswordInput
                  id="settings-new-password"
                  required
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  placeholder="Minimum 8 characters..."
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Confirm New Password</label>
                <PasswordInput
                  id="settings-confirm-password"
                  required
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password..."
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan disabled:opacity-50 transition"
                >
                  {pwdLoading ? 'Updating Password...' : 'Update Password & Revoke Sessions'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Authentication & Session Safeguards</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-semibold block text-slate-100 mb-0.5">Bcrypt Work Factor & Salting</span>
                <span className="text-[11px] text-slate-400">
                  Passwords are encrypted using bcrypt with 10 salt rounds. Never stored in plaintext, logs, or backups.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-semibold block text-slate-100 mb-0.5">Cryptographic Session Revocation</span>
                <span className="text-[11px] text-slate-400">
                  Every user possesses an incremental <code className="text-cyan-400">tokenVersion</code>. Changing your password or logging out increments this counter, instantly invalidating all existing access and refresh tokens.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-semibold block text-slate-100 mb-0.5">Compromised Password Protection</span>
                <span className="text-[11px] text-slate-400">
                  SwordNex CRM requires distinct, unexposed passwords to ensure Google Password Manager and breach databases verify your credentials as completely secure.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Actor / User</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Retrieving cryptographic audit trail...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.entity}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toISOString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
