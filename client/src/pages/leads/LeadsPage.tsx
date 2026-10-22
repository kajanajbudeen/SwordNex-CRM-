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
  Download,
  Upload,
  History,
  CheckSquare,
  Square,
  Edit3,
  X,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { ExportLeadsModal } from './components/ExportLeadsModal';
import { ImportLeadsWizard } from './components/ImportLeadsWizard';
import { ImportHistoryModal } from './components/ImportHistoryModal';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [activeScoreDetail, setActiveScoreDetail] = useState<any | null>(null);
  const [convertingLead, setConvertingLead] = useState<any | null>(null);

  // Modals state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const navigate = useNavigate();

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);

      const res = await apiClient.get(`/leads?${params.toString()}`);
      if (res.success) {
        setLeads(res.data);
        if (res.meta?.total !== undefined) {
          setTotalCount(res.meta.total);
        } else {
          setTotalCount(res.data.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, priorityFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleSelectAllOnPage = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const handleToggleLeadSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
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

  const isAllSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Leads</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {leads.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture, score, qualify, import, export, and convert buyer inquiries with multi-factor AI signals.
          </p>
        </div>

        {/* Action Group: History, Export, Import, Add Lead */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center space-x-1.5 border border-slate-700/80 transition"
            title="Inspect historical CSV/Excel import jobs and error reports"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Import History</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 border border-slate-700/80 transition"
            title="Export filtered, selected, or organization leads into CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowImportWizard(true)}
            className="px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-medium text-xs flex items-center space-x-1.5 border border-cyan-500/40 transition shadow-sm"
            title="Import leads from CSV or Excel file"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import</span>
          </button>

          <button
            onClick={() => navigate('/leads/new')}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
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

        <div className="flex items-center space-x-2.5 flex-wrap">
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

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 outline-none"
          >
            <option value="ALL">All Sources</option>
            <option value="WEBSITE">Website</option>
            <option value="REFERRAL">Referral</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="TRADE_SHOW">Trade Show</option>
            <option value="COLD_CALL">Cold Outreach</option>
            <option value="CAMPAIGN">Campaign</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setSourceFilter('ALL');
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
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAllOnPage}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                </th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-cyan-400" />
                    Synthesizing lead intelligence records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No leads found matching your active filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td
                        className="py-3.5 px-3 text-center"
                        onClick={(e) => handleToggleLeadSelection(lead.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                          <span>
                            {lead.firstName} {lead.lastName}
                          </span>
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
                            onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            title="Edit Lead"
                            className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Selection Banner */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-cyan-500/50 shadow-2xl rounded-2xl px-5 py-3 flex items-center space-x-4 animate-slide-up">
          <div className="flex items-center space-x-2 text-xs font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{selectedLeadIds.length} leads selected</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Selected</span>
          </button>

          <button
            onClick={() => setSelectedLeadIds([])}
            className="p-1 text-slate-400 hover:text-slate-200 transition"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Export Leads Modal */}
      <ExportLeadsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        totalLeadsCount={totalCount}
        filteredLeadsCount={leads.length}
        selectedLeadIds={selectedLeadIds}
        activeFilters={{
          search,
          status: statusFilter,
          priority: priorityFilter,
          source: sourceFilter,
        }}
      />

      {/* Import Leads Wizard */}
      <ImportLeadsWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onImportComplete={() => {
          fetchLeads();
        }}
      />

      {/* Import History Modal */}
      <ImportHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />


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

      {/* End Modals */}
    </div>
  );
};

