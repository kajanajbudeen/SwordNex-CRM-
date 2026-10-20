import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, Globe, Phone, MapPin, DollarSign, ShieldAlert, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { quickPrompt } = useCopilot();

  const [form, setForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    city: '',
    country: '',
    annualRevenue: 5000000,
  });

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/companies${search ? `?search=${search}` : ''}`);
      if (res.success) setCompanies(res.data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/companies', {
        ...form,
        annualRevenue: Number(form.annualRevenue),
      });
      if (res.success) {
        setShowCreateModal(false);
        setForm({
          name: '',
          domain: '',
          industry: '',
          size: '',
          city: '',
          country: '',
          annualRevenue: 5000000,
        });
        fetchCompanies();
      }
    } catch (err: any) {
      alert(`Error creating company: ${err.message}`);
    }
  };

  const getChurnRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Corporate Accounts & Companies</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {companies.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor organizational relationships, technographics, account health scores, and retention signals.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Account</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCompanies()}
            placeholder="Search accounts by name, domain, or industry..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none"
          />
        </div>
      </div>

      {/* Companies List Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Account Name</th>
              <th className="py-3 px-4">Industry / Domain</th>
              <th className="py-3 px-4">Health & Churn Risk</th>
              <th className="py-3 px-4">Annual Revenue</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-right">Related Records</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                  Loading accounts...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No accounts found.
                </td>
              </tr>
            ) : (
              companies.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                        {comp.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-100 block">{comp.name}</span>
                        <span className="text-[10px] text-slate-500">{comp.size || 'Enterprise'}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-slate-300">{comp.industry || 'B2B Software'}</div>
                    <div className="text-[11px] text-cyan-400 font-mono">{comp.domain || '—'}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-xs">
                        {comp.healthScore || 80}%
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold border ${getChurnRiskBadge(
                          comp.churnRisk || 'LOW'
                        )}`}
                      >
                        {comp.churnRisk || 'LOW'} RISK
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    ${((comp.annualRevenue || 0) / 1000000).toFixed(1)}M
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {comp.city ? `${comp.city}, ${comp.country}` : 'Global'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {comp._count?.contacts || 0} Contacts • {comp._count?.deals || 0} Deals
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Account</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Domain</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="acme.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Industry</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Financial Technology"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
