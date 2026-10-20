import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Copy,
  Trash2,
  Save,
  Check,
  Users,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const RolesPermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'MEMBERS'>('MATRIX');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Permission Matrix State for selected role
  // key: "MODULE:ACTION" => boolean
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDept, setNewRoleDept] = useState('SALES');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Team members for assignment tab
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const { currentOrg } = useAuth();

  const MODULES = [
    { key: 'LEADS', name: 'Leads Management' },
    { key: 'CONTACTS', name: 'Contacts & Accounts' },
    { key: 'COMPANIES', name: 'Company Profiles' },
    { key: 'DEALS', name: 'Deals & Pipelines' },
    { key: 'TASKS', name: 'Tasks & Follow-ups' },
    { key: 'EMPLOYEES', name: 'Team & Employee Directory' },
    { key: 'REPORTS', name: 'Reports & Forecasts' },
    { key: 'SETTINGS', name: 'Organization Settings' },
    { key: 'BILLING', name: 'Subscriptions & Billing' },
    { key: 'WORKFLOWS', name: 'Automation Workflows' },
    { key: 'AI_CENTER', name: 'AI Center & Agents' },
    { key: 'COMMS', name: 'Communication Hub' },
  ];

  const ACTIONS = [
    { key: 'VIEW', name: 'View' },
    { key: 'CREATE', name: 'Create' },
    { key: 'EDIT', name: 'Edit' },
    { key: 'DELETE', name: 'Delete' },
    { key: 'APPROVE', name: 'Approve' },
    { key: 'EXPORT', name: 'Export' },
    { key: 'ASSIGN', name: 'Assign' },
    { key: 'MANAGE', name: 'Full Manage' },
  ];

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, teamRes] = await Promise.all([
        apiClient.get('/roles'),
        apiClient.get('/users'),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
        const current =
          rolesRes.data.find((r: any) => r.id === selectedRoleId) || rolesRes.data[0];
        if (current) {
          setSelectedRoleId(current.id);
          loadPermissionsIntoMap(current.permissions);
        }
      }

      if (teamRes.success && teamRes.data) {
        setTeamMembers(teamRes.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const loadPermissionsIntoMap = (perms: any[]) => {
    const map: Record<string, boolean> = {};
    for (const p of perms || []) {
      map[`${p.module}:${p.action}`] = true;
    }
    setPermissionMap(map);
  };

  const handleSelectRole = (role: any) => {
    setSelectedRoleId(role.id);
    loadPermissionsIntoMap(role.permissions);
  };

  const togglePermission = (module: string, action: string) => {
    const key = `${module}:${action}`;
    setPermissionMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleRow = (module: string) => {
    const allChecked = ACTIONS.every((a) => permissionMap[`${module}:${a.key}`]);
    const nextMap = { ...permissionMap };
    for (const a of ACTIONS) {
      nextMap[`${module}:${a.key}`] = !allChecked;
    }
    setPermissionMap(nextMap);
  };

  const toggleCol = (action: string) => {
    const allChecked = MODULES.every((m) => permissionMap[`${m.key}:${action}`]);
    const nextMap = { ...permissionMap };
    for (const m of MODULES) {
      nextMap[`${m.key}:${action}`] = !allChecked;
    }
    setPermissionMap(nextMap);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      const permsArray: { module: string; action: string }[] = [];
      for (const [key, val] of Object.entries(permissionMap)) {
        if (val) {
          const [module, action] = key.split(':');
          permsArray.push({ module, action });
        }
      }

      const res = await apiClient.put(`/roles/${selectedRoleId}/permissions`, {
        permissions: permsArray,
      });

      if (res.success) {
        alert(res.message || 'Permissions updated successfully!');
        fetchRoles();
      }
    } catch (err: any) {
      alert(`Error saving permissions: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      const res = await apiClient.post('/roles', {
        name: newRoleName.trim(),
        department: newRoleDept,
        description: newRoleDesc,
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewRoleName('');
        setNewRoleDesc('');
        alert(`Role '${res.data.name}' created successfully!`);
        fetchRoles();
      }
    } catch (err: any) {
      alert(`Error creating role: ${err.message}`);
    }
  };

  const handleDuplicateRole = async () => {
    if (!selectedRoleId) return;
    try {
      const res = await apiClient.post(`/roles/${selectedRoleId}/duplicate`);
      if (res.success) {
        alert(res.message);
        fetchRoles();
      }
    } catch (err: any) {
      alert(`Error duplicating role: ${err.message}`);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleId) return;
    if (!confirm('Are you sure you want to delete this custom role?')) return;

    try {
      const res = await apiClient.delete(`/roles/${selectedRoleId}`);
      if (res.success) {
        alert(res.message);
        setSelectedRoleId(null);
        fetchRoles();
      }
    } catch (err: any) {
      alert(`Error deleting role: ${err.message}`);
    }
  };

  const handleAssignMember = async (userId: string, customRoleId: string | null) => {
    try {
      const res = await apiClient.patch('/roles/assign-member', {
        userId,
        customRoleId,
      });
      if (res.success) {
        fetchRoles();
      }
    } catch (err: any) {
      alert(`Error assigning role: ${err.message}`);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Dynamic Roles & Granular Permissions</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              RBAC MATRIX
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure custom employee roles and independent module-level action permissions across your organization.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono flex items-center space-x-1.5 transition shadow-glow-cyan self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* Main Layout: Left Role List + Right Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Roles Sidebar List */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
            Organization Roles ({roles.length})
          </p>

          <div className="space-y-1.5">
            {roles.map((r) => {
              const isSelected = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/20 shadow-glow-cyan text-white'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs truncate">{r.name}</span>
                      {r.isSystem && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Dept: {r.department} • {r.memberCount} member(s)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {r.permissions?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Role Details, Actions & Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {selectedRole ? (
            <>
              {/* Role Header Banner */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-extrabold text-white">{selectedRole.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      DEPARTMENT: {selectedRole.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedRole.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDuplicateRole}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1 transition"
                    title="Duplicate this role"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  {!selectedRole.isSystem && (
                    <button
                      onClick={handleDeleteRole}
                      className="px-3 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono flex items-center space-x-1 transition"
                      title="Delete this role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center space-x-1.5 transition shadow-glow-cyan"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Matrix'}</span>
                  </button>
                </div>
              </div>

              {/* Tabs: Matrix vs Members */}
              <div className="flex items-center space-x-2 border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('MATRIX')}
                  className={`px-4 py-2 text-xs font-mono font-bold transition border-b-2 ${
                    activeTab === 'MATRIX'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Permission Matrix ({selectedRole.permissions?.length || 0} active rules)
                </button>
                <button
                  onClick={() => setActiveTab('MEMBERS')}
                  className={`px-4 py-2 text-xs font-mono font-bold transition border-b-2 ${
                    activeTab === 'MEMBERS'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Assigned Team Members ({selectedRole.memberCount})
                </button>
              </div>

              {/* Tab 1: Permission Matrix Grid */}
              {activeTab === 'MATRIX' && (
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                          <th className="py-2.5 px-3">CRM Module</th>
                          {ACTIONS.map((a) => (
                            <th key={a.key} className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleCol(a.key)}
                                className="hover:text-cyan-300 transition font-bold"
                                title={`Toggle all for ${a.name}`}
                              >
                                {a.name}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {MODULES.map((m) => {
                          return (
                            <tr key={m.key} className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => toggleRow(m.key)}
                                  className="font-bold text-white hover:text-cyan-300 transition text-left"
                                  title="Toggle entire row"
                                >
                                  {m.name}
                                </button>
                              </td>

                              {ACTIONS.map((a) => {
                                const isChecked = !!permissionMap[`${m.key}:${a.key}`];
                                return (
                                  <td key={a.key} className="py-2.5 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(m.key, a.key)}
                                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Assigned Team Members */}
              {activeTab === 'MEMBERS' && (
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <p className="text-xs text-slate-400 font-mono">
                    Employees assigned to the <strong className="text-white">{selectedRole.name}</strong> role. Use the dropdown to reassign them to another custom role.
                  </p>

                  <div className="divide-y divide-slate-800">
                    {teamMembers.map((member) => {
                      const isCurrentRole = member.customRoleId === selectedRole.id;
                      return (
                        <div key={member.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {member.email} • {member.title || 'Team Member'}
                            </p>
                          </div>

                          <div className="flex items-center space-x-3">
                            <select
                              value={member.customRoleId || ''}
                              onChange={(e) => handleAssignMember(member.id, e.target.value || null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                            >
                              <option value="">No Custom Role</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.department})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Select a role on the left to inspect or edit permissions.
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRole}
            className="glass-panel w-full max-w-md p-6 rounded-2xl border border-cyan-500/30 bg-[#0B0F1E] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Create New Custom Role</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1 font-bold uppercase tracking-wider">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Executive, HR Manager, Support Lead"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={newRoleDept}
                  onChange={(e) => setNewRoleDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                >
                  <option value="SALES">Sales</option>
                  <option value="SUPPORT">Customer Support</option>
                  <option value="HR">HR / People</option>
                  <option value="MANAGEMENT">Management / Leadership</option>
                  <option value="FINANCE">Finance / Accounts</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="GENERAL">General / Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Primary duties and responsibilities for this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition shadow-glow-cyan"
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
