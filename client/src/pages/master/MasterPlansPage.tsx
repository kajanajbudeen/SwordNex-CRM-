import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Save,
  Sparkles,
  Shield,
  Layers,
  Zap,
  RefreshCw,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const MasterPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('STANDARD');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const availableModules = [
    'LEADS',
    'CONTACTS',
    'COMPANIES',
    'DEALS',
    'TASKS',
    'REPORTS',
    'COMMS',
    'WORKFLOWS',
    'AI_CENTER',
    'INTEGRATIONS',
    'SETTINGS',
    'BILLING',
  ];

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/swordnex-master/plans');
      if (res.success && res.data) {
        setPlans(res.data);
        const current = res.data.find((p: any) => p.slug === selectedSlug) || res.data[0];
        if (current) {
          setSelectedSlug(current.slug);
          setEditingPlan({ ...current });
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: any) => {
    setSelectedSlug(plan.slug);
    setEditingPlan({ ...plan });
  };

  const toggleModule = (mod: string) => {
    if (!editingPlan) return;
    const currentMods: string[] = editingPlan.allowedModules || [];
    const nextMods = currentMods.includes(mod)
      ? currentMods.filter((m) => m !== mod)
      : [...currentMods, mod];
    setEditingPlan({ ...editingPlan, allowedModules: nextMods });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      const res = await apiClient.put(`/swordnex-master/plans/${editingPlan.slug}`, editingPlan);
      if (res.success) {
        alert(res.message || 'Plan configuration updated successfully!');
        fetchPlans();
      }
    } catch (err: any) {
      alert(`Error updating plan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-purple-400 font-mono text-xs animate-pulse">
        Loading SaaS Subscription Plan configurations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>SaaS Subscription Plan Configurator</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              DYNAMIC ENTITLEMENT ENGINE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure live commercial pricing (INR), resource quotas, trial duration, and module permissions without redeploying.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition self-start"
          title="Refresh Plans"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Plan Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isSelected = p.slug === selectedSlug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => handleSelectPlan(p)}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/20 shadow-lg shadow-purple-500/10'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">{p.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                  {p.slug}
                </span>
              </div>
              <p className="text-lg font-black text-white font-mono">
                {p.slug === 'FREE_TRIAL'
                  ? '₹0 (Free Trial)'
                  : `₹${(p.monthlyPrice || 0).toLocaleString('en-IN')} / mo`}
              </p>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Up to {p.maxUsers} users • {(p.maxLeads || 0).toLocaleString()} leads
              </span>
            </button>
          );
        })}
      </div>

      {/* Plan Edit Form */}
      {editingPlan && (
        <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-purple-500/20 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Editing: {editingPlan.name} ({editingPlan.slug})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Changes take effect dynamically for all new signups and subscription renewals.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow-lg shadow-purple-600/25 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Updates...' : 'Save Plan Configuration'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase font-bold text-purple-300 tracking-wider">
                1. Plan Identity & Commercials (INR)
              </h3>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Display Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Monthly (₹ INR)</label>
                  <input
                    type="number"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Yearly (₹ INR)</label>
                  <input
                    type="number"
                    value={editingPlan.yearlyPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Trial Days</label>
                  <input
                    type="number"
                    value={editingPlan.trialDays || 15}
                    onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Grace Days</label>
                  <input
                    type="number"
                    value={editingPlan.gracePeriodDays || 3}
                    onChange={(e) => setEditingPlan({ ...editingPlan, gracePeriodDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Quotas & Capacity */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase font-bold text-cyan-300 tracking-wider">
                2. Resource Quotas & Limits
              </h3>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Max User Seats</label>
                <input
                  type="number"
                  value={editingPlan.maxUsers || 5}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxUsers: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Max Custom Roles</label>
                <input
                  type="number"
                  value={editingPlan.maxCustomRoles || 5}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxCustomRoles: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Lead Record Capacity</label>
                <input
                  type="number"
                  value={editingPlan.maxLeads || 15000}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxLeads: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Monthly AI Tokens</label>
                <input
                  type="number"
                  value={editingPlan.maxAiTokens || 500000}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxAiTokens: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Allowed Modules & Features */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase font-bold text-emerald-300 tracking-wider">
                3. Allowed CRM Modules & Entitlements
              </h3>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <p className="text-[10px] text-slate-400 font-mono mb-2 uppercase">Permitted Modules:</p>
                <div className="grid grid-cols-2 gap-2">
                  {availableModules.map((mod) => {
                    const isChecked = (editingPlan.allowedModules || []).includes(mod);
                    return (
                      <label
                        key={mod}
                        className="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModule(mod)}
                          className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                        />
                        <span className="text-[11px]">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-2 text-xs font-mono text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.aiFeaturesEnabled || false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, aiFeaturesEnabled: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>AI Agents & Copilot Features Enabled</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-mono text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.apiAccessEnabled || false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, apiAccessEnabled: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>REST API Key Access Allowed</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
