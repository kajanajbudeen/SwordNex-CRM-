import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Cpu,
  Download,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { apiClient } from '../../api/client';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [velocity, setVelocity] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [dashRes, velRes, srcRes, usageRes] = await Promise.all([
          apiClient.get('/reports/dashboard-summary'),
          apiClient.get('/reports/sales-velocity'),
          apiClient.get('/reports/lead-sources'),
          apiClient.get('/reports/usage-metrics'),
        ]);

        if (dashRes.success) setSummary(dashRes.data);
        if (velRes.success) setVelocity(velRes.data);
        if (srcRes.success) setLeadSources(srcRes.data);
        if (usageRes.success) setUsageMetrics(usageRes.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const pieColors = ['#00F0FF', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'];

  // Predictive Monthly Forecast projection
  const forecastTrend = [
    { month: 'Jul', committed: 65000, bestCase: 85000 },
    { month: 'Aug', committed: 95000, bestCase: 130000 },
    { month: 'Sep', committed: 140000, bestCase: 195000 },
    { month: 'Oct (Current)', committed: 185000, bestCase: 260000 },
    { month: 'Nov (AI Est)', committed: 230000, bestCase: 340000 },
    { month: 'Dec (AI Est)', committed: 290000, bestCase: 420000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Executive Analytics & Forecasts</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Q4 MODEL
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Holistic sales velocity, acquisition channel attribution, and AI token metering.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting full CRM analytics report in CSV/PDF format...')}
          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Analytics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Total Booked Won Revenue</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            ${(summary?.kpis?.wonRevenue || 0).toLocaleString()}
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Closed Won Contracts</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Current Pipeline Velocity</span>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            ${(summary?.kpis?.pipelineValue || 0).toLocaleString()}
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Across active stages</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Weighted AI Forecast</span>
          <p className="text-2xl font-black text-violet-400 mt-1">
            ${(summary?.kpis?.weightedForecast || 0).toLocaleString()}
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Probability calibrated</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Lead to Win Conversion</span>
          <p className="text-2xl font-black text-white mt-1">
            {summary?.kpis?.conversionRate || '0%'}
          </p>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">Efficiency ratio</span>
        </div>
      </div>

      {/* Predictive Forecast Trend Chart */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Predictive Revenue Forecast & Velocity Model</span>
            </h3>
            <p className="text-xs text-slate-400">Committed pipeline vs best-case scenario projections</p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>Committed</span>
            </span>
            <span className="flex items-center space-x-1 text-violet-400">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
              <span>Best-Case</span>
            </span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastTrend}>
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `$${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
              />
              <Line type="monotone" dataKey="committed" stroke="#00F0FF" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="bestCase" stroke="#8B5CF6" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Usage & Infrastructure Metering */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>AI Compute Usage & SaaS Quota Metering</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Token consumption across Lead Scoring, Copilot calls, Autonomous Agents, and Summarizations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-xs font-mono text-cyan-400 uppercase">Tokens Consumed</span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {(usageMetrics?.subscription?.aiTokensUsed || 142050).toLocaleString()}
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-cyan-400 h-full w-[14%]"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Limit: {(usageMetrics?.subscription?.aiTokenLimit || 5000000).toLocaleString()} Tokens
            </span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-xs font-mono text-emerald-400 uppercase">Seats Utilized</span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              3 / {usageMetrics?.subscription?.seatCount || 50}
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[6%]"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Active Enterprise Team Members</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-xs font-mono text-violet-400 uppercase">Lead Capacity</span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {summary?.kpis?.totalLeads || 0} / {(usageMetrics?.subscription?.leadLimit || 100000).toLocaleString()}
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-violet-400 h-full w-[3%]"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Tenant database storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
