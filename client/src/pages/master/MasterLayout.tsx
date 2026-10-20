import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Sliders,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MasterLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Platform Dashboard', path: '/swordnex-master/dashboard', icon: LayoutDashboard },
    { label: 'Registered Companies', path: '/swordnex-master/organizations', icon: Building2 },
    { label: 'SaaS Plan Configurator', path: '/swordnex-master/plans', icon: Sliders },
    { label: 'Subscriptions & Revenue', path: '/swordnex-master/subscriptions', icon: CreditCard },
    { label: 'Platform Security Logs', path: '/swordnex-master/audit-logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex">
      {/* Master Left Sidebar */}
      <aside className="w-64 bg-[#090C1A] border-r border-purple-500/20 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
        {/* Master Branding */}
        <div className="h-16 px-4 border-b border-purple-500/20 flex items-center justify-between bg-purple-950/20">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/swordnex-master/dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-base border border-purple-400/40">
              S
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white tracking-tight text-sm">SwordNex</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 font-mono font-bold border border-purple-400/30">
                  MASTER
                </span>
              </div>
              <p className="text-[10px] text-purple-300/80 font-mono">Head Office Platform</p>
            </div>
          </div>
        </div>

        {/* Master Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
            Platform Administration
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-mono transition ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-purple-400" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Switch to CRM Workspace & User */}
        <div className="p-3 border-t border-purple-500/20 bg-[#060812] space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-between transition"
          >
            <span>Open CRM Workspace</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 truncate">
              <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-400/30 flex items-center justify-center font-bold text-purple-300 text-xs">
                {user?.firstName?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-purple-400 font-mono">Super Admin</p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/swordnex-master/login');
              }}
              title="Sign Out of Master Platform"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen bg-[#070913] flex flex-col">
        {/* Master Top Header Bar */}
        <header className="h-14 px-6 border-b border-purple-500/10 bg-[#090C1A]/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-400">
              SwordNex Master Controller • Production Multi-Tenant Platform Active
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              AUTH: SUPER_ADMIN
            </span>
          </div>
        </header>

        {/* Child Pages Content */}
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
