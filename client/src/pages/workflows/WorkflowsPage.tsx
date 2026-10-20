import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  FileCode,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowRuns, setSelectedWorkflowRuns] = useState<any[] | null>(null);
  const [activeWorkflowName, setActiveWorkflowName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: 'Auto-Assign High Value Enterprise Deals',
    description: 'When deal value exceeds $50k, assign to Senior VP and trigger executive review task',
    triggerType: 'DEAL_STAGE_CHANGED',
    conditionField: 'amount',
    conditionOperator: 'GREATER_THAN',
    conditionValue: '50000',
    actionType: 'CREATE_TASK',
    actionTitle: 'Schedule Executive Review with VP',
  });

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/workflows');
      if (res.success) setWorkflows(res.data);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggleActive = async (workflow: any) => {
    try {
      const res = await apiClient.patch(`/workflows/${workflow.id}`, {
        isActive: !workflow.isActive,
      });
      if (res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflow.id ? { ...w, isActive: !w.isActive } : w))
        );
      }
    } catch (err: any) {
      alert(`Error toggling workflow: ${err.message}`);
    }
  };

  const handleViewRuns = async (workflow: any) => {
    setActiveWorkflowName(workflow.name);
    try {
      const res = await apiClient.get(`/workflows/${workflow.id}/runs`);
      if (res.success) {
        setSelectedWorkflowRuns(res.data);
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/workflows', {
        name: form.name,
        description: form.description,
        triggerType: form.triggerType,
        conditions: [
          {
            field: form.conditionField,
            operator: form.conditionOperator,
            value: form.conditionValue,
          },
        ],
        actions: [
          {
            type: form.actionType,
            params: { title: form.actionTitle, priority: 'HIGH' },
          },
        ],
        isActive: true,
      });

      if (res.success) {
        setShowCreateModal(false);
        fetchWorkflows();
      }
    } catch (err: any) {
      alert(`Error creating workflow: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Automation Workflow Engine</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Trigger → Conditions → Actions
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Build event-driven sales sequences, auto-routing rules, and autonomous AI task triggers.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Workflows Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 font-mono">
            Loading automation workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 glass-panel rounded-xl border border-slate-800">
            No workflows configured. Create your first workflow above.
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="font-bold text-slate-100 text-sm">{wf.name}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                      wf.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {wf.isActive ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{wf.description}</p>

                {/* Visual Pipeline Steps */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono">
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    ⚡ Trigger: {wf.triggerType}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-violet-300">
                    🔍 Conditions ({Array.isArray(wf.conditions) ? wf.conditions.length : 0})
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-300">
                    🚀 Actions ({Array.isArray(wf.actions) ? wf.actions.length : 0})
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  onClick={() => handleViewRuns(wf)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition"
                >
                  Logs ({wf.runCount || 0} runs)
                </button>

                <button
                  onClick={() => handleToggleActive(wf)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                    wf.isActive
                      ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                      : 'text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title={wf.isActive ? 'Pause Workflow' : 'Activate Workflow'}
                >
                  {wf.isActive ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Execution Logs Modal */}
      {selectedWorkflowRuns && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0F172A] border border-cyan-500/40 rounded-xl p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Execution Logs: {activeWorkflowName}</h3>
              <button onClick={() => setSelectedWorkflowRuns(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedWorkflowRuns.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No execution runs recorded yet.</p>
              ) : (
                selectedWorkflowRuns.map((run) => (
                  <div key={run.id} className="p-3 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-cyan-400 font-bold">{run.triggerEvent}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          run.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 text-[11px] text-slate-300 space-y-1">
                      {Array.isArray(run.executionLogs) &&
                        run.executionLogs.map((log: string, i: number) => <div key={i}>{log}</div>)}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Started: {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedWorkflowRuns(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Build Automation Workflow</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 resize-none"
                ></textarea>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">1. TRIGGER</span>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                >
                  <option value="LEAD_CREATED">When a Lead is Created</option>
                  <option value="LEAD_UPDATED">When a Lead is Updated</option>
                  <option value="DEAL_STAGE_CHANGED">When a Deal Changes Pipeline Stage</option>
                  <option value="TASK_OVERDUE">When a Task becomes Overdue</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="font-mono text-[10px] text-violet-400 font-bold uppercase">2. CONDITION CHECK</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={form.conditionField}
                    onChange={(e) => setForm({ ...form, conditionField: e.target.value })}
                    placeholder="field"
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <select
                    value={form.conditionOperator}
                    onChange={(e) => setForm({ ...form, conditionOperator: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  >
                    <option value="GREATER_THAN">&gt; Greater Than</option>
                    <option value="EQUALS">= Equals</option>
                    <option value="CONTAINS">Contains</option>
                  </select>
                  <input
                    type="text"
                    value={form.conditionValue}
                    onChange={(e) => setForm({ ...form, conditionValue: e.target.value })}
                    placeholder="value"
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">3. ACTION TO EXECUTE</span>
                <select
                  value={form.actionType}
                  onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono mb-2"
                >
                  <option value="CREATE_TASK">Create Follow-up Task</option>
                  <option value="CALCULATE_AI_SCORE">Recalculate AI Lead Score</option>
                  <option value="ADD_ACTIVITY_NOTE">Log Activity Note in Timeline</option>
                </select>
                <input
                  type="text"
                  value={form.actionTitle}
                  onChange={(e) => setForm({ ...form, actionTitle: e.target.value })}
                  placeholder="Task title or note description"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Save & Activate Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
