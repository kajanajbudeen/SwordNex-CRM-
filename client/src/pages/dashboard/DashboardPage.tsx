import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  CheckCircle2,
  LifeBuoy,
  Briefcase,
  Zap,
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
} from 'recharts';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';
import { useAuth } from '../../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { currentOrg, trialStatus, currentMembership } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'executive';

  const [data, setData] = useState<any>(null);
  const [velocityData, setVelocityData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { quickPrompt } = useCopilot();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, velRes, srcRes] = await Promise.all([
          apiClient.get('/reports/dashboard-summary'),
          apiClient.get('/reports/sales-velocity'),
          apiClient.get('/reports/lead-sources'),
        ]);

        if (dashRes.success) setData(dashRes.data);
        if (velRes.success) setVelocityData(velRes.data);
        if (srcRes.success) setSourceData(srcRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-xl border border-slate-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-900 rounded-xl border border-slate-800"></div>
          <div className="h-72 bg-slate-900 rounded-xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const aiInsights = data?.aiInsights || [];

  const pieColors = ['#00F0FF', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Executive Revenue Cockpit</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              LIVE SYNTHESIS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline progression, predictive forecasts, and autonomous sales intelligence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => quickPrompt('Analyze current pipeline bottlenecks and prioritize this week\'s closing plan.')}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Cockpit Briefing</span>
          </button>
        </div>
      </div>

      {/* Trial Countdown / Grace Period / Expiration Alerts */}
      {trialStatus?.isTrialExpired && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-200">15-Day Free Trial Expired — Write Operations Restricted</h4>
              <p className="text-xs text-rose-300/80">
                Your workspace is in historical read-only mode. Upgrade to Standard or Premium to reactivate full write access.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs whitespace-nowrap transition shadow-glow-rose flex-shrink-0"
          >
            Upgrade Plan Now
          </button>
        </div>
      )}

      {trialStatus?.isGracePeriodActive && !trialStatus?.isTrialExpired && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">Trial Grace Period Active (3 Days Left)</h4>
              <p className="text-xs text-amber-300/80">
                Your trial has ended. A 3-day grace window is active before operations become read-only. Renew your subscription immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow-glow flex-shrink-0"
          >
            Renew Subscription
          </button>
        </div>
      )}

      {currentOrg?.plan === 'FREE_TRIAL' && !trialStatus?.isTrialExpired && !trialStatus?.isGracePeriodActive && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-100">SwordNex 15-Day Free Trial</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  {trialStatus?.trialDaysRemaining ?? 15} DAYS REMAINING
                </span>
              </div>
              <p className="text-[11px] text-slate-400">All enterprise AI CRM features unlocked. Upgrade anytime to keep your team synced.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow-glow-cyan flex-shrink-0"
          >
            Upgrade to Standard / Premium
          </button>
        </div>
      )}

      {/* Role / Department Views Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mr-2 flex-shrink-0">
          Department View:
        </span>
        {[
          { key: 'executive', label: 'Executive Cockpit', icon: Target },
          { key: 'sales', label: 'Sales Velocity', icon: Zap },
          { key: 'support', label: 'Customer Support', icon: LifeBuoy },
          { key: 'team', label: 'Team Operations', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ view: tab.key })}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Department-Specific Highlights Banner */}
      {activeView === 'sales' && (
        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-blue-200">
            <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>
              <strong>Sales Focus:</strong> Showing active pipeline velocity, win probabilities, and upcoming deal negotiations.
            </span>
          </div>
          <button
            onClick={() => navigate('/deals')}
            className="text-cyan-400 hover:underline flex items-center space-x-1 text-xs font-semibold whitespace-nowrap"
          >
            <span>Go to Kanban</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeView === 'support' && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-emerald-200">
            <LifeBuoy className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Support Focus:</strong> First Response Time avg 14 mins • CSAT 98.2% • 12 active priority tickets.
            </span>
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="text-emerald-400 hover:underline flex items-center space-x-1 text-xs font-semibold whitespace-nowrap"
          >
            <span>View Support Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeView === 'team' && (
        <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-violet-200">
            <Users className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span>
              <strong>Operations Focus:</strong> Department task completion 94.2% • 18 active team projects • Quota pace: 112%.
            </span>
          </div>
          <button
            onClick={() => navigate('/team')}
            className="text-violet-400 hover:underline flex items-center space-x-1 text-xs font-semibold whitespace-nowrap"
          >
            <span>Manage Team</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Value */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Active Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            ${(kpis.pipelineValue || 0).toLocaleString()}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.activeDealsCount || 0} active enterprise deals</span>
          </div>
        </div>

        {/* Weighted Forecast */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Weighted AI Forecast</span>
            <Target className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            ${(kpis.weightedForecast || 0).toLocaleString()}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-cyan-300">
            <span>Stage probability calibrated</span>
          </div>
        </div>

        {/* Lead Qualification */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Leads Qualified</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {kpis.qualifiedLeads || 0}{' '}
            <span className="text-xs font-normal text-slate-400">/ {kpis.totalLeads || 0}</span>
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-slate-400">
            <span className="text-cyan-400 font-semibold">{kpis.conversionRate}</span>
            <span>lead-to-win rate</span>
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Follow-up Velocity</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {kpis.tasksOverdue || 0}{' '}
            <span className="text-xs font-normal text-amber-400">Overdue Tasks</span>
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-slate-400">
            <button
              onClick={() => navigate('/tasks?overdue=true')}
              className="text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>Review urgent tasks</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Prescriptive Insights Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-violet-950/40 border border-cyan-500/30 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
              AI Continuous Intelligence & Prescriptive Actions
            </h2>
          </div>
          <button
            onClick={() => navigate('/ai-center')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
          >
            <span>Open AI Center</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiInsights.map((insight: any) => (
            <div
              key={insight.id}
              className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col justify-between hover:border-cyan-500/40 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-100">{insight.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      insight.type === 'RISK'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : insight.type === 'GROWTH'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {insight.type}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{insight.text}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                <button
                  onClick={() => quickPrompt(`Execute prescriptive action for: ${insight.title}`)}
                  className="text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>Act now</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section: Sales Funnel & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Pipeline Funnel / Velocity */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Pipeline Stage Distribution & Value</h3>
              <p className="text-xs text-slate-400">Total volume across each progressive sales milestone</p>
            </div>
            <button
              onClick={() => navigate('/deals')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>View Kanban Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis
                  dataKey="stageName"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Pipeline Value']}
                />
                <Bar dataKey="stageValue" fill="#00F0FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Breakdown */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Acquisition Attribution</h3>
            <p className="text-xs text-slate-400 mb-4">Channel volume and average AI qualification score</p>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {sourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 mt-2 border-t border-slate-800 pt-3">
            {sourceData.slice(0, 4).map((src, i) => (
              <div key={src.source} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: pieColors[i % pieColors.length] }}
                  ></div>
                  <span className="text-slate-300 capitalize">{src.source.toLowerCase()}</span>
                </div>
                <span className="font-mono text-slate-400">
                  {src.count} leads (avg {src.averageScore})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
