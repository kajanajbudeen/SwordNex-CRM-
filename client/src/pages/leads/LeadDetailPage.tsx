import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  MessageSquare,
  FileText,
  User,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [nba, setNba] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('NOTE');
  const { quickPrompt } = useCopilot();
  const navigate = useNavigate();

  const fetchLeadDetails = async () => {
    try {
      const res = await apiClient.get(`/leads/${id}`);
      if (res.success) {
        setLead(res.data);

        // Fetch AI Next Best Action
        const nbaRes = await apiClient.post('/ai/next-best-action', {
          type: 'LEAD',
          title: `${res.data.firstName} ${res.data.lastName}`,
          stageOrStatus: res.data.status,
          lastActivityDaysAgo: 2,
        });
        if (nbaRes.success) setNba(nbaRes.data);
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLeadDetails();
  }, [id]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await apiClient.post('/activities', {
        leadId: id,
        type: noteType,
        title: `${noteType} Logged`,
        description: newNote,
      });

      if (res.success) {
        setNewNote('');
        fetchLeadDetails();
      }
    } catch (err: any) {
      alert(`Error logging activity: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono animate-pulse">
        Loading 360-degree lead intelligence profile...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-rose-400">
        Lead not found or access denied.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => quickPrompt(`Draft a personalized cold email for ${lead.firstName} at ${lead.company}`)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Email Assistant</span>
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-glow-cyan flex-shrink-0">
              {lead.firstName.charAt(0)}
              {lead.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {lead.firstName} {lead.lastName}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI Score: {lead.score}/100
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                  {lead.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-2">
                <span>{lead.title || 'Decision Maker'}</span>
                {lead.company && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-cyan-400 font-medium">{lead.company}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                {lead.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 font-mono text-[11px]">
                  <span>Source: {lead.source}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Scoring Summary */}
        {lead.scoreExplanation && (
          <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <span className="font-mono text-cyan-400 font-semibold uppercase text-[10px] block mb-1">
              AI Scoring Analysis
            </span>
            <p>{lead.scoreExplanation}</p>
          </div>
        )}
      </div>

      {/* AI Next Best Action Prescriptive Card */}
      {nba && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-blue-950/30 border border-cyan-500/40 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold font-mono uppercase text-cyan-300 tracking-wider">
                AI Next Best Action Recommendation
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              URGENCY: {nba.urgency}
            </span>
          </div>
          <p className="text-sm font-bold text-white mt-2">{nba.action}</p>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{nba.reasoning}</p>
          {nba.suggestedTemplate && (
            <div className="mt-2.5 p-2.5 rounded bg-slate-900/90 border border-slate-800 text-xs text-slate-400 font-mono">
              <span className="text-[10px] text-cyan-400 block mb-0.5 uppercase">Draft Outreach Snippet:</span>
              "{nba.suggestedTemplate.replace('{{firstName}}', lead.firstName).replace('{{company}}', lead.company || 'your team')}"
            </div>
          )}
        </div>
      )}

      {/* 360-Degree Activity Timeline & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <span>Customer 360 Activity History</span>
            <span className="text-[10px] font-mono text-slate-400">({lead.activities?.length || 0} events)</span>
          </h3>

          {/* Quick Log Form */}
          <form onSubmit={handleAddActivity} className="mb-6 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              {(['NOTE', 'CALL', 'EMAIL', 'MEETING'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={`text-[10px] px-2 py-1 rounded font-mono font-semibold transition ${
                    noteType === t
                      ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Log notes, conversation highlights, or touchpoints..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400 resize-none"
            ></textarea>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log {noteType}</span>
              </button>
            </div>
          </form>

          {/* Events Stream */}
          <div className="space-y-4">
            {lead.activities?.length === 0 ? (
              <p className="text-xs text-slate-500">No activity recorded yet for this lead.</p>
            ) : (
              lead.activities?.map((act: any) => (
                <div key={act.id} className="flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="font-semibold text-slate-200">{act.title}</span>
                      <span className="text-[10px] font-mono">{new Date(act.createdAt).toLocaleString()}</span>
                    </div>
                    {act.description && <p className="text-slate-300 leading-relaxed">{act.description}</p>}
                    {act.createdBy && (
                      <p className="text-[10px] text-slate-500 mt-1">Logged by {act.createdBy.firstName}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Associated Follow-up Tasks</h3>
          <div className="space-y-2.5">
            {lead.tasks?.length === 0 ? (
              <p className="text-xs text-slate-500">No pending follow-up tasks.</p>
            ) : (
              lead.tasks?.map((tsk: any) => (
                <div key={tsk.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">{tsk.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                      {tsk.priority}
                    </span>
                  </div>
                  {tsk.description && <p className="text-slate-400 text-[11px] mb-2">{tsk.description}</p>}
                  {tsk.dueDate && (
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Due: {new Date(tsk.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
