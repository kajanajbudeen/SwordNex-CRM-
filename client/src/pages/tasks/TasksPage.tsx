import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Video,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { quickPrompt } = useCopilot();

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'HIGH',
    category: 'FOLLOW_UP',
  });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const res = await apiClient.get(`/tasks?${params.toString()}`);
      if (res.success) setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/tasks', form);
      if (res.success) {
        setShowCreateModal(false);
        setForm({
          title: '',
          description: '',
          dueDate: '',
          priority: 'HIGH',
          category: 'FOLLOW_UP',
        });
        fetchTasks();
      }
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'CALL':
        return <Phone className="w-3.5 h-3.5 text-cyan-400" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case 'MEETING':
        return <Video className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Tasks & Follow-up Sequences</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {tasks.length} Reminders
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Prioritized sales activities, automated reminders, and AI-prescribed follow-up actions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => quickPrompt('Generate personalized task follow-up reminders for high-value leads.')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Suggest Tasks</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {['ALL', 'PENDING', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 font-mono">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 glass-panel rounded-xl border border-slate-800">
            No tasks found. You are all caught up!
          </div>
        ) : (
          tasks.map((task) => {
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

            return (
              <div
                key={task.id}
                className={`glass-panel p-4 rounded-xl border transition flex items-center justify-between ${
                  isOverdue ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                } hover:border-cyan-500/40`}
              >
                <div className="flex items-start space-x-3.5">
                  <button
                    onClick={() => handleToggleComplete(task.id, task.status)}
                    className="mt-0.5 text-slate-500 hover:text-cyan-400 transition"
                  >
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <div className="w-5 h-5 rounded border border-slate-600 hover:border-cyan-400"></div>
                    )}
                  </button>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded bg-slate-900 border border-slate-800">
                        {getCategoryIcon(task.category)}
                      </span>
                      <h3
                        className={`text-xs font-bold text-slate-100 ${
                          task.status === 'COMPLETED' ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.aiSuggested && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI SUGGESTED</span>
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                      {task.dueDate && (
                        <span className={isOverdue ? 'text-amber-400 font-bold' : ''}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {isOverdue && ' (OVERDUE)'}
                        </span>
                      )}
                      {task.lead && (
                        <span>
                          Lead: {task.lead.firstName} {task.lead.lastName} ({task.lead.company})
                        </span>
                      )}
                      {task.deal && <span>Deal: {task.deal.title}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                      task.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : task.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Task or Follow-up</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Call COO to review proposal redlines"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Specific talking points or objective..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="PREPARATION">Preparation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
