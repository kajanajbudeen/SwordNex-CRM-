import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotDrawer } from '../ai/CopilotDrawer';
import { CommandPalette } from '../common/CommandPalette';

export const AppLayout: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#080C16] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col pl-64 overflow-hidden">
        <Header onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 bg-[#080C16]/95">
          <Outlet />
        </main>
      </div>

      {/* Floating Global Overlays */}
      <CopilotDrawer />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
};
