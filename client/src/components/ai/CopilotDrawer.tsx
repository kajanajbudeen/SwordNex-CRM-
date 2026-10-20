import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext';

export const CopilotDrawer: React.FC = () => {
  const { isOpen, closeCopilot, messages, sendMessage, isLoading } = useCopilot();
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const samplePrompts = [
    'What is our weighted pipeline forecast?',
    'Show me the highest scoring leads today.',
    'Recommend next actions for stalled deals.',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0B1120] border-l border-cyan-500/30 shadow-2xl z-40 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-glow-cyan text-slate-950">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
              <span>SwordNex Copilot</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">v1.0</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Autonomous Sales Intelligence</p>
          </div>
        </div>
        <button
          onClick={closeCopilot}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto whitespace-nowrap space-x-2 flex">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(p)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition flex-shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400 font-mono">
              {msg.sender === 'USER' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-400">SwordNex AI</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                msg.sender === 'USER'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px]">
                  <p className="font-mono text-cyan-400 text-[10px] mb-1">CITED CRM ENTITIES:</p>
                  <ul className="space-y-0.5">
                    {msg.citations.map((c, i) => (
                      <li key={i} className="text-slate-400 font-mono">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Next Actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-mono text-cyan-400 mb-1.5 font-semibold">RECOMMENDED ACTIONS:</p>
                  <div className="space-y-1">
                    {msg.suggestedActions.map((act, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{act}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono p-3 bg-slate-900/60 rounded-lg border border-slate-800 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing tenant CRM records and synthesizing answer...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-[#070B14]">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot a question..."
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-cyan transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
