import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { CreateTicketModal } from './components/CreateTicketModal';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      params.append('page', String(page));
      params.append('limit', '15');

      const [ticketsRes, summaryRes] = await Promise.all([
        apiClient.get(`/tickets?${params.toString()}`),
        apiClient.get('/tickets/summary'),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data.tickets || []);
        setMeta(ticketsRes.data.meta);
      }
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>URGENT</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            OPEN
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            IN PROGRESS
          </span>
        );
      case 'WAITING_ON_CUSTOMER':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            WAITING ON CUSTOMER
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            CLOSED
          </span>
        );
      default:
        return null;
    }
  };

  const isSlaBreached = (ticket: any) => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return false;
    if (!ticket.resolutionDueAt) return false;
    return new Date(ticket.resolutionDueAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Customer Support & Tickets</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SLA ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage inquiries, technical incidents, SLA escalation timers, and AI-assisted responses.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchTickets()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Tickets</span>
            <Inbox className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{summary?.total || 0}</p>
          <span className="text-[10px] text-slate-400">All registered incidents</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Open & Active</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1">
            {(summary?.open || 0) + (summary?.inProgress || 0)}
          </p>
          <span className="text-[10px] text-slate-400">Awaiting resolution</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Urgent Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{summary?.urgent || 0}</p>
          <span className="text-[10px] text-rose-400/80 font-mono">Priority Tier 1 SLA</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{summary?.resolved || 0}</p>
          <span className="text-[10px] text-emerald-400/80 font-mono">Customer verified</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Tickets' },
            { id: 'OPEN', label: 'Open' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'WAITING_ON_CUSTOMER', label: 'Waiting on Customer' },
            { id: 'RESOLVED', label: 'Resolved' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-semibold ${
                statusFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-850">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, subject, or contact email..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </form>

          <div className="flex items-center space-x-3">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="TECHNICAL">Technical Bug</option>
              <option value="BILLING">Billing</option>
              <option value="PRODUCT">Product Guidance</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">Loading support tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <LifeBuoy className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">No tickets found</p>
            <p className="text-xs text-slate-500">Try adjusting your filters or log a new support ticket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SLA Status</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map((t) => {
                  const breached = isSlaBreached(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-900/60 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100 max-w-xs truncate">{t.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.contact ? (
                          <div>
                            <div className="font-medium text-slate-200">
                              {t.contact.firstName} {t.contact.lastName}
                            </div>
                            <div className="text-[10px] text-slate-500">{t.contact.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Direct Inquiry</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(t.status)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Met</span>
                          </span>
                        ) : breached ? (
                          <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>BREACHED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-cyan-300 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Within SLA</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.assignedTo ? (
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[9px] flex items-center justify-center border border-cyan-500/30">
                              {t.assignedTo.firstName[0]}
                            </div>
                            <span className="text-slate-300 text-xs">
                              {t.assignedTo.firstName} {t.assignedTo.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${t.id}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium inline-flex items-center space-x-1 transition"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {tickets.length} of {meta.total} tickets (Page {meta.page} of {meta.totalPages})
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchTickets()}
      />
    </div>
  );
};
