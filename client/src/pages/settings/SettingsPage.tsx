import React, { useState, useEffect } from 'react';
import { Settings, Shield, History, Building, CheckCircle2, Lock } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'AUDIT'>('GENERAL');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
