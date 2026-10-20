import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeScoreDetail, setActiveScoreDetail] = useState<any | null>(null);
  const [convertingLead, setConvertingLead] = useState<any | null>(null);

  const [newLeadForm, setNewLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    source: 'WEBSITE',
    priority: 'MEDIUM',
  });

  const navigate = useNavigate();

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const res = await apiClient.get(`/leads?${params.toString()}`);
      if (res.success) {
        setLeads(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/leads', newLeadForm);
      if (res.success) {
        setShowCreateModal(false);
        setNewLeadForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          title: '',
          source: 'WEBSITE',
          priority: 'MEDIUM',
        });
        fetchLeads();
      }
    } catch (err: any) {
      alert(`Error creating lead: ${err.message}`);
    }
  };

  const handleRescore = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.post(`/leads/${leadId}/score`);
      if (res.success) {
        setActiveScoreDetail(res.data);
        fetchLeads();
      }
    } catch (err: any) {
      alert(`Scoring failed: ${err.message}`);
    }
  };

  const handleConvertLead = async (leadId: string) => {
    try {
      const res = await apiClient.post(`/leads/${leadId}/convert`, {
        createDeal: true,
      });
      if (res.success) {
        setConvertingLead(null);
        alert('Lead successfully converted to Contact, Company, and Deal!');
        fetchLeads();
      }
    } catch (err: any) {
      alert(`Conversion error: ${err.message}`);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 50) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Lead Intelligence Engine</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {leads.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture, score, qualify, and convert buyer inquiries with multi-factor AI signals.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, company, or email..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none"
          />
        </form>

        <div className="flex items-center space-x-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="UNQUALIFIED">Unqualified</option>
            <option value="CONVERTED">Converted</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
            }}
            className="px-2.5 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Lead Name / Title</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">AI Score</th>
                <th className="py-3 px-4">Priority / Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-cyan-400" />
                    Synthesizing lead intelligence records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No leads found matching your active filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                        <span>{lead.firstName} {lead.lastName}</span>
                        {lead.status === 'CONVERTED' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono">
                            CONVERTED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span>{lead.title || 'Prospect'}</span>
                        {lead.email && <span className="text-slate-500">• {lead.email}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lead.company || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveScoreDetail({
                            lead,
                            factors: [
                              { signal: 'Title Seniority', impact: 25, explanation: lead.scoreExplanation },
                            ],
                          });
                        }}
                        className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded font-mono font-semibold border ${getScoreBadgeColor(
                          lead.score
                        )} hover:scale-105 transition`}
                        title="Click to view AI score explainability factors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{lead.score}/100</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                            lead.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : lead.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {lead.priority}
                        </span>
                        <span className="text-[11px] text-slate-400">{lead.status}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {lead.source}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        {lead.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertLead(lead.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Convert</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleRescore(lead.id, e)}
                          title="Recalculate AI Score"
                          className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Score Explainability Modal */}
      {activeScoreDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-xl p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">AI Lead Score Explainability</h3>
              </div>
              <button onClick={() => setActiveScoreDetail(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300">Composite Score</span>
                <span className="text-lg font-black font-mono text-cyan-400">
                  {activeScoreDetail.lead?.score || activeScoreDetail.score}/100
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                {activeScoreDetail.lead?.scoreExplanation || activeScoreDetail.summary}
              </p>
            </div>

            {activeScoreDetail.factors && activeScoreDetail.factors.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Evaluated Predictive Signals</h4>
                <div className="space-y-2">
                  {activeScoreDetail.factors.map((f: any, i: number) => (
                    <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                        <span>{f.signal}</span>
                        <span className="text-emerald-400 font-mono">+{f.impact} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveScoreDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.firstName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, firstName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.lastName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, lastName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company</label>
                <input
                  type="text"
                  value={newLeadForm.company}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                  placeholder="Company name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title / Designation</label>
                <input
                  type="text"
                  value={newLeadForm.title}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                  placeholder="e.g. Chief Technology Officer"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="work@company.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="COLD_CALL">Cold Outreach</option>
                    <option value="CAMPAIGN">Campaign</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newLeadForm.priority}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
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
                  Save & Compute Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
