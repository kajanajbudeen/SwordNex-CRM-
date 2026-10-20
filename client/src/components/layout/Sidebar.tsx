import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Kanban,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Workflow,
  BarChart3,
  Plug,
  Settings,
  CreditCard,
  ShieldCheck,
  Building2,
  Megaphone,
  LogOut,
  ChevronDown,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, currentOrg, currentMembership, workspaces, switchOrganization, logout, can, isSuperAdmin } = useAuth();
  const [showOrgDropdown, setShowOrgDropdown] = React.useState(false);
  const navigate = useNavigate();

  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: null },
    { label: 'Leads', path: '/leads', icon: Users, module: 'LEADS' },
    { label: 'Deals & Pipeline', path: '/deals', icon: Kanban, module: 'DEALS' },
    { label: 'Contacts', path: '/contacts', icon: Briefcase, module: 'CONTACTS' },
    { label: 'Companies', path: '/companies', icon: Building2, module: 'COMPANIES' },
    { label: 'Tasks & Follow-ups', path: '/tasks', icon: CheckSquare, module: 'TASKS' },
    { label: 'Communication Hub', path: '/inbox', icon: MessageSquare, module: 'COMMS' },
    { label: 'Campaigns', path: '/campaigns', icon: Megaphone, module: 'LEADS' },
    { label: 'AI Center', path: '/ai-center', icon: Sparkles, badge: 'AI', module: 'AI_CENTER' },
    { label: 'Automations', path: '/workflows', icon: Workflow, module: 'WORKFLOWS' },
    { label: 'Reports & Forecasts', path: '/reports', icon: BarChart3, module: 'REPORTS' },
    { label: 'Integrations', path: '/integrations', icon: Plug, module: 'SETTINGS' },
    { label: 'Team Members', path: '/team', icon: Users, module: 'EMPLOYEES' },
    { label: 'Roles & Permissions', path: '/settings/roles-permissions', icon: ShieldCheck, module: 'SETTINGS' },
    { label: 'Billing & Usage', path: '/billing', icon: CreditCard, module: 'BILLING' },
    { label: 'Settings & Audit', path: '/settings', icon: Settings, module: 'SETTINGS' },
  ];

  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.module) return true;
    return can(item.module, 'VIEW');
  });

  return (
    <aside className="w-64 bg-[#0B1120] border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan text-white font-black text-lg">
            S
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-100 tracking-tight text-base">SwordNex</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">CRM Platform</p>
          </div>
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-3 pt-3 pb-1 relative">
        <button
          onClick={() => setShowOrgDropdown(!showOrgDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-left transition"
        >
          <div className="truncate">
            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider font-mono">Workspace</p>
            <p className="text-xs font-medium text-slate-200 truncate">{currentOrg?.name || 'Select Workspace'}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 flex-shrink-0" />
        </button>

        {showOrgDropdown && (
          <div className="absolute top-14 left-3 right-3 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <p className="px-3 py-1 text-[10px] uppercase font-mono text-slate-400">Your Organizations</p>
            {workspaces.map((w) => (
              <button
                key={w.organizationId}
                onClick={() => {
                  setShowOrgDropdown(false);
                  switchOrganization(w.organizationId);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${
                  w.organizationId === currentOrg?.id ? 'text-cyan-400 font-medium bg-cyan-500/10' : 'text-slate-300'
                }`}
              >
                <span className="truncate">{w.organization.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{w.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 font-mono border border-cyan-500/40">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Master Portal Link for Super Admin */}
        {isSuperAdmin && (
          <div className="pt-2">
            <button
              onClick={() => navigate('/swordnex-master/dashboard')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition group shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="truncate font-semibold">Master Head Office</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-mono font-bold uppercase">
                HQ
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* User Profile & Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#070B14]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs flex-shrink-0">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {currentMembership?.customRoleName || currentMembership?.role || user?.globalRole}
                {currentMembership?.department ? ` • ${currentMembership.department}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
