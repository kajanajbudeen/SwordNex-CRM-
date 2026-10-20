import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Sliders,
  X,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const MasterOrganizationsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'STATUS' | 'EXTEND_TRIAL' | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ACTIVE');
  const [suspendReason, setSuspendReason] = useState('');
  const [extraDays, setExtraDays] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrgs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/swordnex-master/organizations');
      if (res.success) {
        setOrgs(res.data);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleStatusSubmit = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.patch(`/swordnex-master/organizations/${selectedOrg.id}/status`, {
        status: newStatus,
        reason: newStatus === 'SUSPENDED' ? suspendReason : undefined,
      });
      if (res.success) {
        alert(res.message);
        setModalType(null);
        fetchOrgs();
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendTrialSubmit = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/swordnex-master/organizations/${selectedOrg.id}/extend-trial`, {
        extraDays: Number(extraDays),
      });
      if (res.success) {
        alert(res.message);
        setModalType(null);
        fetchOrgs();
      }
    } catch (err: any) {
      alert(`Error extending trial: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase()) ||
      (org.domain && org.domain.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Customer Organization Directory</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {orgs.length} REGISTERED
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Oversight of customer tenants, active status flags, trial lifecycles, and plan subscriptions.
          </p>
        </div>

        <button
          onClick={fetchOrgs}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition self-start"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search company name, domain, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-400 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-3">Plan / Status</th>
                <th className="py-3 px-3">Trial / Renewal</th>
                <th className="py-3 px-3">Users</th>
                <th className="py-3 px-3">Leads</th>
                <th className="py-3 px-3">Onboarded</th>
                <th className="py-3 px-4 text-right">Master Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 animate-pulse">
                    Loading customer companies...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No organizations matching search query.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const sub = org.subscription;
                  const isTrial = sub?.status === 'TRIALING';

                  return (
                    <tr key={org.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white text-sm tracking-tight">{org.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            slug: {org.slug} {org.domain && `• ${org.domain}`}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              org.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : org.status === 'SUSPENDED'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {org.status}
                          </span>
                          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                            {org.plan}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {isTrial ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{sub.remainingTrialDays} days remaining</span>
                            </span>
                            <span className="text-[10px] text-slate-500 block">15-day Free Trial</span>
                          </div>
                        ) : sub ? (
                          <div>
                            <span className="text-[11px] text-emerald-400 font-bold">
                              ₹{(sub.price || 0).toLocaleString('en-IN')}/{sub.billingInterval === 'YEARLY' ? 'yr' : 'mo'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        {org.memberCount} users
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        {(org.leadCount || 0).toLocaleString()} leads
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isTrial && (
                            <button
                              onClick={() => {
                                setSelectedOrg(org);
                                setModalType('EXTEND_TRIAL');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
                              title="Extend Free Trial"
                            >
                              + Extend Trial
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedOrg(org);
                              setNewStatus(org.status);
                              setSuspendReason(org.suspendedReason || '');
                              setModalType('STATUS');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              org.status === 'ACTIVE'
                                ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border-slate-700 hover:border-red-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                          >
                            {org.status === 'ACTIVE' ? 'Change Status' : 'Activate Org'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Status Modal */}
      {modalType === 'STATUS' && selectedOrg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-purple-500/30 bg-[#0B0F1E] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Update Status: {selectedOrg.name}</span>
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold uppercase tracking-wider">
                  Target Account Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                        newStatus === st
                          ? st === 'ACTIVE'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : st === 'SUSPENDED'
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-slate-800 border-slate-600 text-slate-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {newStatus === 'SUSPENDED' && (
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold uppercase tracking-wider">
                    Suspension Reason (Visible to Customer Admin)
                  </label>
                  <textarea
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="e.g. Account past due 30 days. Contact billing support to reactivate."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-400 transition"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleStatusSubmit}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Trial Modal */}
      {modalType === 'EXTEND_TRIAL' && selectedOrg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-amber-500/30 bg-[#0B0F1E] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Extend Free Trial: {selectedOrg.name}</span>
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-slate-400">
                Grant additional free trial days to this customer organization. Server timestamps will be updated and recorded in the audit log.
              </p>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold uppercase tracking-wider">
                  Additional Trial Days
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtraDays(days)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                        extraDays === days
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExtendTrialSubmit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition"
              >
                {isSubmitting ? 'Extending...' : `Extend by ${extraDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
