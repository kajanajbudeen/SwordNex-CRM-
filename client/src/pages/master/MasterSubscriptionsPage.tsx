import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Sliders,
  Calendar,
  X,
  Plus,
  Receipt,
  Download,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const MasterSubscriptionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUBSCRIPTIONS' | 'PAYMENTS' | 'INVOICES' | 'AUDIT'>(
    'OVERVIEW'
  );
  const [analytics, setAnalytics] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for subscriptions tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Modals for privileged Super Admin actions
  const [selectedSubForExtend, setSelectedSubForExtend] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(15);
  const [extendReason, setExtendReason] = useState('');
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const [selectedSubForStatus, setSelectedSubForStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, subsRes, payRes, invRes, auditRes] = await Promise.all([
        apiClient.get('/swordnex-master/subscriptions/analytics'),
        apiClient.get('/swordnex-master/subscriptions'),
        apiClient.get('/swordnex-master/payments'),
        apiClient.get('/swordnex-master/invoices'),
        apiClient.get('/swordnex-master/audit-logs'),
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (subsRes.success) setSubscriptions(subsRes.data);
      if (payRes.success) setPayments(payRes.data);
      if (invRes.success) setInvoices(invRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Failed to load master subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForExtend || !extendReason.trim()) return;

    setIsSubmittingExtend(true);
    try {
      const res = await apiClient.post(`/swordnex-master/subscriptions/${selectedSubForExtend.id}/extend`, {
        extraDays: Number(extendDays),
        reason: extendReason.trim(),
      });

      if (res.success) {
        alert(res.message || 'Subscription successfully extended.');
        setSelectedSubForExtend(null);
        setExtendReason('');
        fetchAllData();
      }
    } catch (err: any) {
      alert(`Error extending subscription: ${err.message}`);
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForStatus || !statusReason.trim()) return;

    setIsSubmittingStatus(true);
    try {
      const res = await apiClient.patch(`/swordnex-master/subscriptions/${selectedSubForStatus.id}/status`, {
        status: newStatus,
        reason: statusReason.trim(),
      });

      if (res.success) {
        alert(res.message || 'Subscription status updated.');
        setSelectedSubForStatus(null);
        setStatusReason('');
        fetchAllData();
      }
    } catch (err: any) {
      alert(`Error updating subscription status: ${err.message}`);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Filtered customer subscriptions
  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch =
      !searchQuery ||
      sub.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.organizationSlug?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || sub.planSlug === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const overview = analytics?.overview || {};
  const planDistribution = analytics?.planDistribution || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>SaaS Subscription & Revenue Console</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              PLATFORM HQ
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-tenant MRR, trial lifecycles, Razorpay transactions, and compliance audit trail.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition self-start flex items-center space-x-1.5 text-xs font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto font-mono text-xs">
        {[
          { key: 'OVERVIEW', label: 'Subscription Overview & MRR', icon: TrendingUp },
          { key: 'SUBSCRIPTIONS', label: `Customer Subscriptions (${subscriptions.length})`, icon: CreditCard },
          { key: 'PAYMENTS', label: `Transactions Ledger (${payments.length})`, icon: DollarSign },
          { key: 'INVOICES', label: `Tax Invoices (${invoices.length})`, icon: Receipt },
          { key: 'AUDIT', label: 'Subscription Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap font-bold ${
                isActive
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue</span>
              <p className="text-2xl font-black text-white font-mono mt-1">₹{(overview.mrrInr || 0).toLocaleString('en-IN')}</p>
              <span className="text-[11px] text-purple-400 font-mono mt-2 block">
                ARR: ₹{(overview.arrInr || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Paid Subscriptions</span>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{overview.activePaid || 0}</p>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">
                ARPU: ₹{(overview.arpuInr || 0).toLocaleString('en-IN')}/org
              </span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active 15-Day Free Trials</span>
              <p className="text-2xl font-black text-cyan-400 font-mono mt-1">{overview.activeTrials || 0}</p>
              <span className="text-[11px] text-cyan-300 font-mono mt-2 block">
                Conversion Rate: {overview.trialToPaidConversionRate || '0%'}
              </span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Renewal Success Rate</span>
              <p className="text-2xl font-black text-blue-400 font-mono mt-1">{overview.renewalSuccessRate || '100%'}</p>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">
                Failed Payments: {overview.failedPaymentRate || '0%'}
              </span>
            </div>
          </div>

          {/* Plan Distribution Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 font-mono">Plan Distribution Across Organizations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(planDistribution).map(([planKey, count]: [string, any]) => (
                <div key={planKey} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase">{planKey.replace('_', ' ')}</span>
                  <p className="text-xl font-black text-white font-mono mt-1">{count} Organizations</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    {planKey === 'FREE_TRIAL'
                      ? '15-Day Instant Sandbox'
                      : planKey === 'STANDARD'
                      ? '₹2,499/mo standard tier'
                      : '₹7,499/mo premium AI suite'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Subscriptions Table */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search organization by name, slug, domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white w-full focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIALING">TRIALING</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELED">CANCELED</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE_TRIAL">FREE TRIAL</option>
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-3">Plan & Cycle</th>
                    <th className="py-3 px-3">Amount (INR)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">User Seats</th>
                    <th className="py-3 px-3">Leads Used</th>
                    <th className="py-3 px-3">Period / Trial End</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No customer subscriptions match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white text-sm tracking-tight">{sub.organizationName}</p>
                          <p className="text-[11px] text-slate-400">{sub.organizationDomain || sub.organizationSlug}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold uppercase text-[10px]">
                            {sub.planSlug}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 uppercase">{sub.billingInterval}</span>
                        </td>
                        <td className="py-3 px-3 font-black text-white">
                          ₹{(sub.price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : sub.status === 'TRIALING'
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {sub.seatsUsed} / {sub.seatCount} seats
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {sub.leadsUsed} / {(sub.leadLimit || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {sub.status === 'TRIALING' && sub.trialEndsAt
                            ? `Trial: ${new Date(sub.trialEndsAt).toLocaleDateString()} (${sub.remainingTrialDays}d left)`
                            : `Renews: ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSubForExtend(sub)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 hover:text-white transition text-[11px]"
                            title="Extend trial or subscription"
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubForStatus(sub);
                              setNewStatus(sub.status);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition text-[11px]"
                            title="Change status"
                          >
                            Status
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payments Transactions Ledger */}
      {activeTab === 'PAYMENTS' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">Platform Payment Transactions (Razorpay / Gateway)</h3>
            <span className="text-xs font-mono text-slate-400">{payments.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Order / Payment ID</th>
                  <th className="py-3 px-3">Organization</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Provider</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Invoice Ref</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{p.paymentId || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{p.orderId}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{p.organization?.name || 'N/A'}</td>
                    <td className="py-3 px-3 font-bold text-white">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-slate-400 uppercase">{p.provider}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-purple-300 font-bold">{p.invoice?.invoiceNumber || 'Pending'}</td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Invoices Ledger */}
      {activeTab === 'INVOICES' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">Tax Invoices (18% GST Compliant)</h3>
            <span className="text-xs font-mono text-slate-400">{invoices.length} Invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Organization</th>
                  <th className="py-3 px-3">Plan & Cycle</th>
                  <th className="py-3 px-3">Subtotal</th>
                  <th className="py-3 px-3">GST (18%)</th>
                  <th className="py-3 px-3">Total (INR)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-purple-300">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-white">{inv.organization?.name}</td>
                    <td className="py-3 px-3 text-slate-400 uppercase">
                      {inv.planSlug} • {inv.billingInterval}
                    </td>
                    <td className="py-3 px-3 text-slate-300">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-slate-400">₹{(inv.tax || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 font-black text-white">
                      ₹{((inv.amount || 0) + (inv.tax || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 ml-auto text-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Subscription Audit Trail */}
      {activeTab === 'AUDIT' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">Immutable Subscription & Billing Audit Logs</h3>
            <span className="text-xs font-mono text-slate-400">Platform Records</span>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {auditLogs
              .filter((log) => log.entity === 'SETTINGS' || log.action === 'APPROVE' || log.action === 'UPDATE')
              .map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-900/40 transition flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-purple-300">{log.action}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-white font-semibold">{log.organization?.name || 'Platform'}</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      {log.details?.actionDescription || JSON.stringify(log.details)}
                    </p>
                    {log.details?.reason && (
                      <p className="text-amber-400 text-[11px] mt-0.5">
                        Mandatory Audit Reason: &quot;{log.details.reason}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right text-slate-500 text-[11px]">
                    <p>{new Date(log.createdAt).toLocaleString()}</p>
                    <p>{log.user?.email || 'System'}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal: Extend Subscription / Trial with Mandatory Reason */}
      {selectedSubForExtend && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleExtendSubmit}
            className="glass-panel w-full max-w-md p-6 rounded-2xl border border-purple-500/30 bg-[#0B0F1E] shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Extend Subscription / Trial</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubForExtend(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-slate-300">
                Organization: <strong className="text-white">{selectedSubForExtend.organizationName}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">Current Plan: {selectedSubForExtend.planSlug}</p>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">Extension Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                required
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">
                Mandatory Reason for Audit Log <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State the administrative justification for extending this account..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSubForExtend(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingExtend}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {isSubmittingExtend ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Change Subscription Status with Mandatory Reason */}
      {selectedSubForStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleStatusSubmit}
            className="glass-panel w-full max-w-md p-6 rounded-2xl border border-purple-500/30 bg-[#0B0F1E] shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Update Subscription Status</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubForStatus(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-slate-300">
                Organization: <strong className="text-white">{selectedSubForStatus.organizationName}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">Current Status: {selectedSubForStatus.status}</p>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-400"
              >
                <option value="ACTIVE">ACTIVE (Full access)</option>
                <option value="TRIALING">TRIALING (Trial countdown)</option>
                <option value="SUSPENDED">SUSPENDED (Account locked)</option>
                <option value="EXPIRED">EXPIRED (Write blocked)</option>
                <option value="CANCELED">CANCELED (End of term)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-bold">
                Mandatory Reason for Audit Log <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State the reason for this administrative status transition..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSubForStatus(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingStatus}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {isSubmittingStatus ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Official Tax Invoice Printable Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 font-mono text-xs text-slate-300 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-lg font-black text-white tracking-tight">TAX INVOICE</span>
                <p className="text-[11px] text-purple-400">SwordNex Technologies Private Limited</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Billed By:</p>
                <p className="font-bold text-white">SwordNex Technologies Pvt. Ltd.</p>
                <p className="text-[11px]">GSTIN: 29AABCS1429B1Z5</p>
                <p className="text-[11px]">Cyber Gateway, Bengaluru, India</p>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] uppercase">Billed To:</p>
                <p className="font-bold text-white">{selectedInvoice.organization?.name}</p>
                <p className="text-[11px]">Invoice #: {selectedInvoice.invoiceNumber}</p>
                <p className="text-[11px]">
                  Date: {new Date(selectedInvoice.paidAt || selectedInvoice.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">Period</th>
                    <th className="p-3 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-white">
                      SwordNex CRM — {selectedInvoice.planSlug} ({selectedInvoice.billingInterval})
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(selectedInvoice.periodStart).toLocaleDateString()} -{' '}
                      {new Date(selectedInvoice.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      ₹{selectedInvoice.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-right text-xs">
              <p>
                Subtotal: <strong className="text-white">₹{selectedInvoice.amount.toLocaleString('en-IN')}</strong>
              </p>
              <p>
                GST (18%): <strong className="text-white">₹{(selectedInvoice.tax || 0).toLocaleString('en-IN')}</strong>
              </p>
              <p className="text-sm border-t border-slate-800 pt-2 font-bold text-purple-300">
                Total Paid: ₹{((selectedInvoice.amount || 0) + (selectedInvoice.tax || 0)).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              <span>Status: <strong className="text-emerald-400">PAID (CONFIRMED)</strong></span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
