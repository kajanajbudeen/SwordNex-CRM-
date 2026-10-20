import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Plus, Mail, Phone, Building, User, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { quickPrompt } = useCopilot();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    department: '',
    lifecycleStage: 'LEAD',
  });

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/contacts${search ? `?search=${search}` : ''}`);
      if (res.success) setContacts(res.data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/contacts', form);
      if (res.success) {
        setShowCreateModal(false);
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          title: '',
          department: '',
          lifecycleStage: 'LEAD',
        });
        fetchContacts();
      }
    } catch (err: any) {
      alert(`Error creating contact: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Customer 360 & Contacts</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {contacts.length} Contacts
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain verified customer stakeholders, relationship intelligence, and touchpoint timelines.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Contact</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchContacts()}
            placeholder="Search contacts by name, email, or department..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-500 font-mono">
            Loading contact records...
          </div>
        ) : contacts.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            No contacts found in this workspace.
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-sm">
                      {contact.firstName.charAt(0)}
                      {contact.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      <p className="text-[11px] text-slate-400">{contact.title || 'Stakeholder'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {contact.lifecycleStage}
                  </span>
                </div>

                {contact.company && (
                  <div className="flex items-center space-x-1.5 mt-3 text-xs text-slate-300">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{contact.company.name}</span>
                  </div>
                )}

                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                  {contact.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  {contact._count?.deals || 0} active deals
                </span>
                <button
                  onClick={() => quickPrompt(`Generate account intelligence summary for ${contact.firstName} ${contact.lastName}`)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[11px] font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Profile</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Contact</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title / Designation</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Chief Revenue Officer"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
