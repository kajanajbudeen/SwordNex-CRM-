import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Users, Kanban, CheckSquare, MessageSquare, ArrowRight, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useCopilot } from '../../context/CopilotContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [naturalResult, setNaturalResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { quickPrompt } = useCopilot();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunNaturalQuery = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiClient.post('/ai/search', { query });
      if (res.success && res.data) {
        setNaturalResult(res.data);
      }
    } catch (err) {
      console.error('Natural search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const navShortcuts = [
    { name: 'View High-Priority Leads', path: '/leads?priority=HIGH', icon: Users },
    { name: 'Open Deal Pipeline Board', path: '/deals', icon: Kanban },
    { name: 'Inspect Overdue Follow-ups', path: '/tasks?overdue=true', icon: CheckSquare },
    { name: 'Unified Communication Inbox', path: '/inbox', icon: MessageSquare },
    { name: 'AI Center Suite', path: '/ai-center', icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/60">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNaturalResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRunNaturalQuery();
            }}
            placeholder="Search records or type natural query (e.g. 'Show high priority leads without follow-up')..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-100 placeholder-slate-500"
            autoFocus
          />
          {query && (
            <button
              onClick={handleRunNaturalQuery}
              disabled={isSearching}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isSearching ? 'Thinking...' : 'AI Search'}</span>
            </button>
          )}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Natural Search Result Display */}
        {naturalResult && (
          <div className="p-4 border-b border-slate-800 bg-cyan-950/20">
            <div className="flex items-center space-x-2 text-xs text-cyan-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">AI Query Interpretation:</span>
              <span className="text-slate-300 font-mono">{naturalResult.interpretation.interpretedQuery}</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {naturalResult.results.length === 0 ? (
                <p className="text-xs text-slate-400">No matching records found for this query.</p>
              ) : (
                naturalResult.results.map((rec: any) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      onClose();
                      navigate(naturalResult.interpretation.targetEntity === 'DEAL' ? '/deals' : `/leads/${rec.id}`);
                    }}
                    className="p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">
                        {rec.title || `${rec.firstName} ${rec.lastName}`}
                      </p>
                      <p className="text-[11px] text-slate-400">{rec.company || rec.email || `Stage: ${rec.stage?.name}`}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Quick Nav Shortcuts */}
        <div className="p-3">
          <p className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Quick Navigation & Workflows</p>
          <div className="space-y-1">
            {navShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    onClose();
                    navigate(item.path);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between text-xs text-slate-300 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 px-4">
          <span>Tip: Type full sentences to query records using natural language.</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
