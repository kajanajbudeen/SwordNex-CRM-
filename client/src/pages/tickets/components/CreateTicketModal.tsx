import React, { useState, useEffect } from 'react';
import { X, LifeBuoy, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { apiClient } from '../../../api/client';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [category, setCategory] = useState('GENERAL');
  const [channel, setChannel] = useState<'EMAIL' | 'PORTAL' | 'PHONE' | 'CHAT' | 'WEB' | 'OTHER'>('PORTAL');
  const [contactId, setContactId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  const [contacts, setContacts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      try {
        const [contactsRes, membersRes] = await Promise.all([
          apiClient.get('/contacts'),
          apiClient.get('/organizations/members'),
        ]);

        if (contactsRes.success) setContacts(contactsRes.data || []);
        if (membersRes.success) setTeamMembers(membersRes.data || []);
      } catch (err) {
        console.error('Failed to load ticket creation options:', err);
      }
    };

    loadOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and a clear issue description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post('/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        channel,
        contactId: contactId || null,
        assignedToId: assignedToId || null,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create support ticket');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create Support Ticket</h2>
              <p className="text-xs text-slate-400">Log customer inquiry, bug, or request with automatic SLA targets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Subject <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Cannot connect custom domain or Webhook error"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority (SLA Tier)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="LOW">Low (72h SLA)</option>
                <option value="MEDIUM">Medium (48h SLA)</option>
                <option value="HIGH">High (24h SLA)</option>
                <option value="URGENT">Urgent (8h SLA, 2h First Response)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="GENERAL">General Inquiry</option>
                <option value="TECHNICAL">Technical Issue / Bug</option>
                <option value="BILLING">Billing & Invoicing</option>
                <option value="PRODUCT">Product Guidance</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact (Requester)</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">No Contact Selected</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Agent</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">Auto-Assign / Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Issue Description & Steps to Reproduce <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the customer's request or problem in detail..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-2 text-slate-400 text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target response SLA will be computed automatically according to priority tier.</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
