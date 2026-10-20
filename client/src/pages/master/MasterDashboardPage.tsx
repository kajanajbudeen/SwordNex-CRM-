import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const MasterDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/swordnex-master/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load master dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-purple-400 font-mono text-xs animate-pulse">
        Connecting to SwordNex Master Telemetry & Analytics...
      </div>
    );
  }

  const { metrics, recentActivity } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>SwordNex Master Platform Overview</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              GLOBAL SaaS CONTROLLER
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time platform revenue telemetry, multi-tenant company oversight, and subscription lifecycle metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/swordnex-master/plans')}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow-lg shadow-purple-600/25"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Plans & Pricing</span>
          </button>
        </div>
      </div>

      {/* Primary SaaS Revenue Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-slate-900/60">
          <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
            <span className="font-mono uppercase font-semibold">Monthly Recurring (MRR)</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-black text-white font-mono">
              ₹{(metrics?.mrrInr || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">INR / mo</span>
          </div>
          <span className="text-[10px] text-purple-300/80 font-mono block mt-2">
            Normalized monthly subscription revenue
          </span>
        </div>

        {/* ARR Card */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/60">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-1">
            <span className="font-mono uppercase font-semibold">Annual Run-Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-black text-white font-mono">
              ₹{(metrics?.arrInr || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">INR / yr</span>
          </div>
          <span className="text-[10px] text-cyan-300/80 font-mono block mt-2">
            Extrapolated annualized revenue baseline
          </span>
        </div>

        {/* Active Companies & Paid Subs */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/60">
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
            <span className="font-mono uppercase font-semibold">Active Paid Accounts</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-black text-white font-mono">{metrics?.activeSubscriptions || 0}</span>
            <span className="text-[11px] text-slate-400 font-mono">of {metrics?.totalOrganizations || 0} orgs</span>
          </div>
          <span className="text-[10px] text-emerald-300/80 font-mono block mt-2">
            Conversion Rate: {metrics?.conversionRate || '0%'}
          </span>
        </div>

        {/* Free Trials */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span className="font-mono uppercase font-semibold">15-Day Free Trials</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-black text-white font-mono">{metrics?.freeTrials || 0}</span>
            <span className="text-[11px] text-amber-400 font-mono font-bold">Active Trials</span>
          </div>
          <span className="text-[10px] text-amber-300/80 font-mono block mt-2">
            {metrics?.expiredSubscriptions || 0} expired • {metrics?.suspendedOrganizations || 0} suspended
          </span>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-mono uppercase">Total Registered Companies</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{metrics?.totalOrganizations || 0}</p>
          </div>
          <Building2 className="w-8 h-8 text-purple-400/50" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-mono uppercase">Total Platform Users</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{metrics?.totalUsers || 0}</p>
          </div>
          <Users className="w-8 h-8 text-cyan-400/50" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-mono uppercase">Suspended / Deactivated Orgs</p>
            <p className="text-xl font-bold font-mono text-red-400 mt-1">{metrics?.suspendedOrganizations || 0}</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-400/50" />
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/20 via-slate-900/60 to-cyan-950/20">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Manage Registered Customer Companies</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View all onboarded companies, extend trial periods, activate/suspend accounts, or inspect tenant limits.
          </p>
        </div>
        <button
          onClick={() => navigate('/swordnex-master/organizations')}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition self-start md:self-auto"
        >
          <span>Open Companies Directory</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Recent Platform Security Audit Stream */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-xs font-mono uppercase font-bold text-slate-300 tracking-wider mb-4 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Recent Platform Security & Administration Events</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5">Timestamp</th>
                <th className="py-2.5 px-3">Organization</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentActivity?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{log.organization?.name || 'Master Platform'}</td>
                  <td className="py-2.5 px-3 text-purple-300">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
