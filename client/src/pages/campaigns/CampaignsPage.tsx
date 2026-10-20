import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Mail, MessageSquare, Play, Calendar, DollarSign } from 'lucide-react';
import { apiClient } from '../../api/client';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'EMAIL',
    subject: '',
    budget: 500,
  });

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/campaigns');
      if (res.success) setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/campaigns', {
        ...form,
        budget: Number(form.budget),
      });
      if (res.success) {
        setShowModal(false);
        setForm({ name: '', type: 'EMAIL', subject: '', budget: 500 });
        fetchCampaigns();
      }
    } catch (err: any) {
      alert(`Error creating campaign: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Marketing Campaigns & Attribution</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {campaigns.length} Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate email blasts, SMS nurturing sequences, and track real-time revenue ROI.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-500 font-mono">
            Loading campaign metrics...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 glass-panel rounded-xl border border-slate-800">
            No marketing campaigns created yet. Click "New Campaign" to launch one.
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {camp.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{camp.status}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm">{camp.name}</h3>
                {camp.subject && <p className="text-xs text-slate-400 mt-1 truncate">Subject: {camp.subject}</p>}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">SENT</span>
                    <span className="text-white font-bold">{camp.sentCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">OPENS</span>
                    <span className="text-cyan-400 font-bold">{camp.openCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">WINS</span>
                    <span className="text-emerald-400 font-bold">{camp.conversionCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Budget: ${camp.budget}</span>
                <span className="text-[10px] font-mono">{new Date(camp.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create Marketing Campaign</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Q4 Enterprise CRM Modernization"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Channel Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                >
                  <option value="EMAIL">Email Marketing Blast</option>
                  <option value="SMS">Twilio SMS Nurturing Sequence</option>
                  <option value="MULTI_CHANNEL">Multi-Channel Inbound</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Accelerate your revenue with SwordNex AI"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Allocated Budget ($)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Schedule Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
