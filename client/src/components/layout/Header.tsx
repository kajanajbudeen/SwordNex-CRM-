import React from 'react';
import { Search, Sparkles, Bell, Plus, Shield } from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onQuickAddLead?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette, onQuickAddLead }) => {
  const { toggleCopilot, isOpen: isCopilotOpen } = useCopilot();
  const { currentOrg, currentMembership } = useAuth();

  return (
    <header className="h-16 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-3 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition text-xs w-64 md:w-80 justify-between group shadow-inner"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
            <span>Search CRM records or ask AI...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        <div className="hidden lg:flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Cloud Online
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Plan: <span className="text-cyan-300 font-semibold">{currentOrg?.plan || 'GROWTH'}</span>
          </span>
        </div>
      </div>

      {/* Right Actions: AI Copilot Toggle & Quick Actions */}
      <div className="flex items-center space-x-3">
        {onQuickAddLead && (
          <button
            onClick={onQuickAddLead}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-glow-cyan transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>
        )}

        {/* AI Copilot Toggle Button */}
        <button
          onClick={toggleCopilot}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm ${
            isCopilotOpen
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 shadow-glow-cyan'
              : 'bg-slate-900 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isCopilotOpen ? 'animate-spin' : 'animate-pulse'}`} />
          <span>AI Copilot</span>
        </button>

        {/* Notifications */}
        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg relative transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0B1120]"></span>
        </button>
      </div>
    </header>
  );
};
