import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, FileText } from 'lucide-react';
import { apiClient } from '../../api/client';

export const MasterAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/swordnex-master/audit-logs');
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Platform Security & Privilege Audit Stream</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              IMMUTABLE LOGS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail of Master administrative actions, organization status alterations, and security logins.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition self-start"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Organization</th>
                <th className="py-3 px-3">Actor / Email</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-4">Audit Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 animate-pulse">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No security audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {log.organization?.name || 'Platform'}
                    </td>
                    <td className="py-3 px-3 text-purple-300">
                      {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System Daemon'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-cyan-400">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
