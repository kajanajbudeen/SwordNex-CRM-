import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LifeBuoy,
  Clock,
  Sparkles,
  Send,
  Lock,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  User,
  Building2,
  Star,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Comment input
  const [commentContent, setCommentContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [aiDraftRationale, setAiDraftRationale] = useState<string | null>(null);

  const fetchTicket = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [ticketRes, membersRes] = await Promise.all([
        apiClient.get(`/tickets/${id}`),
        apiClient.get('/organizations/members'),
      ]);

      if (ticketRes.success) {
        setTicket(ticketRes.data);
      }
      if (membersRes.success) {
        setTeamMembers(membersRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await apiClient.patch(`/tickets/${id}`, { status: newStatus });
      if (res.success) {
        setTicket(res.data);
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const res = await apiClient.patch(`/tickets/${id}`, { priority: newPriority });
      if (res.success) {
        setTicket(res.data);
      }
    } catch (err: any) {
      alert(`Priority update failed: ${err.message}`);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    try {
      const res = await apiClient.patch(`/tickets/${id}`, {
        assignedToId: newAssigneeId || null,
      });
      if (res.success) {
        setTicket(res.data);
      }
    } catch (err: any) {
      alert(`Assignee update failed: ${err.message}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await apiClient.post(`/tickets/${id}/comments`, {
        content: commentContent.trim(),
        isInternal: isInternalNote,
      });

      if (res.success) {
        setCommentContent('');
        setAiDraftRationale(null);
        fetchTicket();
      }
    } catch (err: any) {
      alert(`Failed to add message: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAiDraft = async () => {
    setIsDraftingAi(true);
    try {
      const res = await apiClient.post(`/tickets/${id}/ai-draft`, {});
      if (res.success && res.data?.draft) {
        setCommentContent(res.data.draft);
        setIsInternalNote(false);
        setAiDraftRationale(res.data.suggestedAction || 'AI drafted response based on customer issue description.');
      }
    } catch (err: any) {
      alert(`AI Draft failed: ${err.message}`);
    } finally {
      setIsDraftingAi(false);
    }
  };

  if (isLoading) {
    return <div className="py-24 text-center text-slate-500 font-mono text-xs">Loading incident details...</div>;
  }

  if (!ticket) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <p className="text-base font-semibold">Ticket not found</p>
        <button
          onClick={() => navigate('/tickets')}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
        >
          Return to Tickets
        </button>
      </div>
    );
  }

  const isBreached =
    ticket.status !== 'RESOLVED' &&
    ticket.status !== 'CLOSED' &&
    ticket.resolutionDueAt &&
    new Date(ticket.resolutionDueAt) < new Date();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/tickets')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-cyan-400">{ticket.ticketNumber}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {ticket.category}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">{ticket.subject}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchTicket()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Conversation Thread & Reply */}
        <div className="lg:col-span-2 space-y-4">
          {/* Initial Ticket Problem Statement */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center border border-cyan-500/30">
                  {ticket.contact?.firstName?.[0] || 'C'}
                </div>
                <div>
                  <span className="font-semibold text-slate-200">
                    {ticket.contact ? `${ticket.contact.firstName} ${ticket.contact.lastName}` : 'Direct Inquirer'}
                  </span>
                  <span className="text-slate-500 text-[11px] ml-2">opened this ticket</span>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {new Date(ticket.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Comment Stream */}
          <div className="space-y-3">
            {ticket.comments && ticket.comments.length > 0 ? (
              ticket.comments.map((comment: any) => {
                const isInternal = comment.isInternal;
                return (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-2xl border transition ${
                      isInternal
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : 'glass-panel border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isInternal
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {comment.author?.firstName?.[0] || 'A'}
                        </div>
                        <span className="font-semibold text-slate-200">
                          {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'SwordNex Agent'}
                        </span>
                        {isInternal && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/30 text-amber-300 flex items-center space-x-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>INTERNAL NOTE</span>
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-300">{comment.content}</p>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs font-mono">
                No replies or notes recorded yet.
              </div>
            )}
          </div>

          {/* Reply Box */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            {/* Tab controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(false)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    !isInternalNote
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Public Reply</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(true)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    isInternalNote
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Internal Note</span>
                  </span>
                </button>
              </div>

              {/* AI Copilot Draft Button */}
              <button
                type="button"
                onClick={handleAiDraft}
                disabled={isDraftingAi}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{isDraftingAi ? 'Drafting...' : 'AI Copilot Draft'}</span>
              </button>
            </div>

            {aiDraftRationale && (
              <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-purple-300 text-[11px] flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{aiDraftRationale}</span>
              </div>
            )}

            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                rows={4}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Write an internal note only visible to team members...'
                    : 'Write a response to the customer...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition resize-none"
              />

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentContent.trim()}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg transition disabled:opacity-50 ${
                    isInternalNote
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingComment
                      ? 'Posting...'
                      : isInternalNote
                      ? 'Post Internal Note'
                      : 'Send Public Response'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Incident Metadata & Controls */}
        <div className="space-y-4">
          {/* Quick Status & Priority Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Incident State</h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority (SLA Tier)</label>
              <select
                value={ticket.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="LOW">Low (72h SLA)</option>
                <option value="MEDIUM">Medium (48h SLA)</option>
                <option value="HIGH">High (24h SLA)</option>
                <option value="URGENT">Urgent (8h SLA)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Assigned Agent</label>
              <select
                value={ticket.assignedToId || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SLA Tracking Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">SLA Commitments</h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">First Response SLA</span>
                {ticket.firstRespondedAt ? (
                  <span className="font-mono text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Met</span>
                  </span>
                ) : ticket.firstResponseDueAt ? (
                  <span className="font-mono text-slate-300">
                    {new Date(ticket.firstResponseDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-slate-500">N/A</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Resolution SLA</span>
                {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                  <span className="font-mono text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolved</span>
                  </span>
                ) : isBreached ? (
                  <span className="font-mono font-bold text-rose-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>BREACHED</span>
                  </span>
                ) : ticket.resolutionDueAt ? (
                  <span className="font-mono text-cyan-300 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(ticket.resolutionDueAt).toLocaleDateString()}</span>
                  </span>
                ) : (
                  <span className="text-slate-500">N/A</span>
                )}
              </div>
            </div>
          </div>

          {/* Requester Contact & Account Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Customer Context</h3>

            {ticket.contact ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-100">
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </span>
                </div>
                <div className="text-slate-400 pl-6">{ticket.contact.email || 'No email registered'}</div>
                {ticket.contact.phone && (
                  <div className="text-slate-400 pl-6">{ticket.contact.phone}</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No linked CRM contact record.</div>
            )}

            {ticket.company && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2 text-xs">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-slate-200">{ticket.company.name}</span>
              </div>
            )}
          </div>

          {/* CSAT Card (If Available) */}
          {ticket.csatRating && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Customer Satisfaction (CSAT)
              </h3>
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < ticket.csatRating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                  />
                ))}
                <span className="text-xs font-bold text-slate-200 ml-2">{ticket.csatRating} / 5</span>
              </div>
              {ticket.csatFeedback && (
                <p className="text-xs text-slate-400 italic">"{ticket.csatFeedback}"</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
