import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Sparkles,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Building,
  User,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const DealsKanbanPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeHealthModal, setActiveHealthModal] = useState<any | null>(null);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const { quickPrompt } = useCopilot();

  const [dealForm, setDealForm] = useState({
    title: '',
    amount: 25000,
    stageId: '',
    pipelineId: '',
    expectedCloseDate: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pipeRes, dealRes] = await Promise.all([
        apiClient.get('/deals/pipelines'),
        apiClient.get('/deals'),
      ]);

      if (pipeRes.success && pipeRes.data.length > 0) {
        setPipelines(pipeRes.data);
        const defaultId = pipeRes.data[0].id;
        setSelectedPipelineId(defaultId);
        setDealForm((prev) => ({
          ...prev,
          pipelineId: defaultId,
          stageId: pipeRes.data[0].stages[0]?.id || '',
        }));
      }

      if (dealRes.success) {
        setDeals(dealRes.data);
      }
    } catch (err) {
      console.error('Failed to load deals board:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activePipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
  const stages = activePipeline?.stages || [];

  const handleMoveStage = async (dealId: string, targetStageId: string) => {
    try {
      const res = await apiClient.patch(`/deals/${dealId}`, {
        stageId: targetStageId,
      });

      if (res.success) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stageId: targetStageId, stage: res.data.stage } : d))
        );
      }
    } catch (err: any) {
      alert(`Failed to move deal: ${err.message}`);
    }
  };

  const handleAnalyzeHealth = async (dealId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.post(`/deals/${dealId}/analyze-health`);
      if (res.success) {
        setActiveHealthModal(res.data);
      }
    } catch (err: any) {
      alert(`AI Health Analysis failed: ${err.message}`);
    }
  };

  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/deals', {
        ...dealForm,
        pipelineId: selectedPipelineId,
        amount: Number(dealForm.amount),
      });

      if (res.success) {
        setShowCreateDeal(false);
        setDealForm({
          title: '',
          amount: 25000,
          stageId: stages[0]?.id || '',
          pipelineId: selectedPipelineId,
          expectedCloseDate: '',
        });
        fetchData();
      }
    } catch (err: any) {
      alert(`Error creating deal: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Enterprise Sales Pipeline</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Kanban View
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Stage velocity, probability weightings, and continuous AI deal health diagnosis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => quickPrompt('Analyze all stalled deals in my pipeline and generate recovery steps.')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Stalled Deal Audit</span>
          </button>

          <button
            onClick={() => setShowCreateDeal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-[1200px] h-[calc(100vh-185px)]">
          {stages.map((stage: any) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-900/60 border border-slate-800 p-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }}></div>
                      <h3 className="text-xs font-bold text-slate-100">{stage.name}</h3>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      ${totalStageValue.toLocaleString()} ({stage.winProbability}%)
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 font-mono text-slate-300">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Column Deal Cards */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageDeals.map((deal: any) => (
                    <div
                      key={deal.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 shadow-md group transition select-none"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition line-clamp-2">
                          {deal.title}
                        </h4>
                        <button
                          onClick={(e) => handleAnalyzeHealth(deal.id, e)}
                          title="Run AI Deal Health Check"
                          className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-900 transition flex-shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      </div>

                      {deal.company && (
                        <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-slate-400">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span className="truncate">{deal.company.name}</span>
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white font-mono">
                          ${deal.amount.toLocaleString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                              deal.healthScore >= 75
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            Health: {deal.healthScore}%
                          </span>
                        </div>
                      </div>

                      {/* Stage Mover Selector */}
                      <div className="mt-2.5 pt-2 border-t border-slate-900/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Move:</span>
                        <select
                          value={deal.stageId}
                          onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-cyan-400 rounded px-1.5 py-0.5 outline-none font-mono text-[10px]"
                        >
                          {stages.map((st: any) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="h-28 rounded-lg border border-dashed border-slate-800/80 flex items-center justify-center text-xs text-slate-600 font-mono">
                      Empty Stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Deal Health Diagnostics Modal */}
      {activeHealthModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-xl p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">AI Deal Health Diagnostic</h3>
              </div>
              <button onClick={() => setActiveHealthModal(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200">{activeHealthModal.deal?.title}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Stage Health Status: <span className="text-cyan-400">{activeHealthModal.health?.status}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-cyan-300">
                  {activeHealthModal.health?.healthScore}/100
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-mono uppercase text-slate-400 text-[10px] mb-1">Identified Deal Risks:</h4>
                <ul className="space-y-1">
                  {activeHealthModal.health?.risks.map((r: string, idx: number) => (
                    <li key={idx} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-mono uppercase text-slate-400 text-[10px] mb-1">Prescriptive Recommendations:</h4>
                <ul className="space-y-1">
                  {activeHealthModal.health?.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                      ✓ {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveHealthModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Close Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      {showCreateDeal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Deal</h3>
            <form onSubmit={handleCreateDealSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Opportunity Title</label>
                <input
                  type="text"
                  required
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  placeholder="e.g. CloudScale Global Enterprise Expansion"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deal Value (USD)</label>
                <input
                  type="number"
                  required
                  value={dealForm.amount}
                  onChange={(e) => setDealForm({ ...dealForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Pipeline Stage</label>
                <select
                  value={dealForm.stageId}
                  onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                >
                  {stages.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.winProbability}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Close Date</label>
                <input
                  type="date"
                  value={dealForm.expectedCloseDate}
                  onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDeal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
