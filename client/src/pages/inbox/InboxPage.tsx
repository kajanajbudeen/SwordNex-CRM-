import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

export const InboxPage: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { quickPrompt } = useCopilot();

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(
        `/comms/conversations${channelFilter !== 'ALL' ? `?channel=${channelFilter}` : ''}`
      );
      if (res.success && res.data.length > 0) {
        setConversations(res.data);
        if (!selectedConvoId) {
          setSelectedConvoId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (convoId: string) => {
    try {
      const res = await apiClient.get(`/comms/conversations/${convoId}/messages`);
      if (res.success) {
        setActiveMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [channelFilter]);

  useEffect(() => {
    if (selectedConvoId) {
      fetchMessages(selectedConvoId);
    }
  }, [selectedConvoId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageBody.trim() || !selectedConvoId || isSending) return;

    const currentConvo = conversations.find((c) => c.id === selectedConvoId);
    setIsSending(true);

    try {
      const res = await apiClient.post(`/comms/conversations/${selectedConvoId}/messages`, {
        body: newMessageBody,
        channel: currentConvo?.channel || 'EMAIL',
      });

      if (res.success) {
        setNewMessageBody('');
        fetchMessages(selectedConvoId);
      }
    } catch (err: any) {
      alert(`Message dispatch error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const activeConvo = conversations.find((c) => c.id === selectedConvoId);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Unified Communication Hub</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Multi-Channel Timeline
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated timeline for Email, WhatsApp, and SMS with verifiable dispatch statuses.
          </p>
        </div>

        <button
          onClick={() => quickPrompt('Draft a concise follow-up email for Elena Rostova')}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Email Drafter</span>
        </button>
      </div>

      {/* Main Inbox Two-Column Layout */}
      <div className="flex-1 glass-panel rounded-xl border border-slate-800 overflow-hidden flex shadow-2xl">
        {/* Left Column: Conversation Threads */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/60">
          <div className="p-3 border-b border-slate-800 flex items-center space-x-2">
            {['ALL', 'EMAIL', 'WHATSAPP'].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`text-[10px] font-mono px-2 py-1 rounded font-semibold transition ${
                  channelFilter === ch
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No active conversations found.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConvoId(c.id)}
                  className={`p-3.5 cursor-pointer transition ${
                    selectedConvoId === c.id ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-200 truncate">
                      {c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : c.subject || 'Direct Thread'}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">{c.channel}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {c.messages?.[0]?.body || 'No messages yet'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    {new Date(c.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Chat Timeline & Message Composer */}
        <div className="flex-1 flex flex-col bg-slate-900/30">
          {activeConvo ? (
            <>
              {/* Active Thread Header */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{activeConvo.subject || 'Customer Conversation'}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Channel: {activeConvo.channel} • Recipient:{' '}
                    {activeConvo.contact?.email || activeConvo.contact?.phone || 'Verified Stakeholder'}
                  </p>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.senderType === 'AGENT' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mb-1">
                      <span>{msg.senderType}</span>
                      <span>• {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                        msg.senderType === 'AGENT'
                          ? 'bg-cyan-600 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.body}</p>

                      {/* Status & Failure Diagnostics */}
                      <div className="mt-2 pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
                        <span
                          className={`font-semibold ${
                            msg.status === 'SENT' || msg.status === 'DELIVERED'
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                          }`}
                        >
                          Status: {msg.status}
                        </span>
                      </div>

                      {msg.failureReason && (
                        <p className="mt-1 text-[10px] text-amber-200 font-mono bg-amber-950/40 p-1 rounded">
                          {msg.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessageBody}
                    onChange={(e) => setNewMessageBody(e.target.value)}
                    placeholder={`Compose ${activeConvo.channel.toLowerCase()} message...`}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessageBody.trim() || isSending}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a conversation thread to view timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
