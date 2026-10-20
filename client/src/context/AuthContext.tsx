import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status?: string;
  domain?: string;
  logoUrl?: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  role: string;
  title?: string;
  customRoleId?: string;
  customRoleName?: string;
  department?: string;
  organization: Organization;
}

export interface TrialStatus {
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  isGracePeriodActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentOrg: Organization | null;
  currentMembership: Membership | null;
  workspaces: Membership[];
  permissions: string[];
  trialStatus: TrialStatus | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  can: (module: string, action?: string) => boolean;
  login: (email: string, password: string) => Promise<{ dashboardView: string } | undefined>;
  masterLogin: (email: string, password: string) => Promise<any>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('sn_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sn_token'));
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(() => {
    const cached = localStorage.getItem('sn_org');
    return cached ? JSON.parse(cached) : null;
  });
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(() => {
    const cached = localStorage.getItem('sn_membership');
    return cached ? JSON.parse(cached) : null;
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    const cached = localStorage.getItem('sn_permissions');
    return cached ? JSON.parse(cached) : [];
  });
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(() => {
    const cached = localStorage.getItem('sn_trial_status');
    return cached ? JSON.parse(cached) : null;
  });
  const [workspaces, setWorkspaces] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [meRes, workspacesRes] = await Promise.all([
        apiClient.get('/auth/me'),
        apiClient.get('/organizations/my-workspaces'),
      ]);

      if (meRes.success && meRes.data) {
        setUser(meRes.data.user);
        localStorage.setItem('sn_user', JSON.stringify(meRes.data.user));

        if (meRes.data.currentMembership) {
          setCurrentMembership(meRes.data.currentMembership);
          localStorage.setItem('sn_membership', JSON.stringify(meRes.data.currentMembership));
          const org = meRes.data.currentMembership.organization || meRes.data.user.memberships?.[0]?.organization;
          if (org) {
            setCurrentOrg(org);
            localStorage.setItem('sn_org', JSON.stringify(org));
            localStorage.setItem('sn_org_id', org.id);
          }
        }
      }

      if (workspacesRes.success) {
        setWorkspaces(workspacesRes.data);
      }
    } catch (err: any) {
      if (err?.status === 0 || err?.name === 'TypeError') {
        console.warn('Backend server connection pending. Retaining cached local session.');
      } else {
        console.warn('Session expired or invalid:', err?.message || err);
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const can = (module: string, action: string = 'VIEW'): boolean => {
    if (!user) return false;
    if (user.globalRole === 'SUPER_ADMIN') return true;
    if (currentMembership?.role === 'ADMIN') return true;

    if (permissions.includes('*:*')) return true;
    if (permissions.includes(`${module}:MANAGE`)) return true;
    return permissions.includes(`${module}:${action}`);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setCurrentOrg(res.data.organization);
        setCurrentMembership(res.data.membership);
        setPermissions(res.data.permissions || []);
        setTrialStatus(res.data.trialStatus || null);

        localStorage.setItem('sn_token', res.data.token);
        localStorage.setItem('sn_user', JSON.stringify(res.data.user));
        localStorage.setItem('sn_permissions', JSON.stringify(res.data.permissions || []));

        if (res.data.membership) {
          localStorage.setItem('sn_membership', JSON.stringify(res.data.membership));
        }

        if (res.data.trialStatus) {
          localStorage.setItem('sn_trial_status', JSON.stringify(res.data.trialStatus));
        }

        if (res.data.organization) {
          localStorage.setItem('sn_org', JSON.stringify(res.data.organization));
          localStorage.setItem('sn_org_id', res.data.organization.id);
        }

        return { dashboardView: res.data.dashboardView || '/dashboard' };
      }
    } finally {
      setIsLoading(false);
    }
  };

  const masterLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/swordnex-master/auth/login', { email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setPermissions(['*:*']);

        localStorage.setItem('sn_token', res.data.token);
        localStorage.setItem('sn_user', JSON.stringify(res.data.user));
        localStorage.setItem('sn_permissions', JSON.stringify(['*:*']));

        return res.data;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/register', data);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setCurrentOrg(res.data.organization);
        setCurrentMembership(res.data.membership);
        setPermissions(['*:*']);
        setTrialStatus({ trialDaysRemaining: 15, isTrialExpired: false, isGracePeriodActive: false });

        localStorage.setItem('sn_token', res.data.token);
        localStorage.setItem('sn_user', JSON.stringify(res.data.user));
        localStorage.setItem('sn_org', JSON.stringify(res.data.organization));
        localStorage.setItem('sn_org_id', res.data.organization.id);
        localStorage.setItem('sn_permissions', JSON.stringify(['*:*']));
        localStorage.setItem('sn_trial_status', JSON.stringify({ trialDaysRemaining: 15, isTrialExpired: false, isGracePeriodActive: false }));

        await refreshProfile();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    localStorage.setItem('sn_org_id', orgId);
    const targetWs = workspaces.find((w) => w.organizationId === orgId);
    if (targetWs) {
      setCurrentOrg(targetWs.organization);
      setCurrentMembership(targetWs);
      localStorage.setItem('sn_org', JSON.stringify(targetWs.organization));
    }
    window.location.reload();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCurrentOrg(null);
    setCurrentMembership(null);
    setPermissions([]);
    setTrialStatus(null);
    setWorkspaces([]);
    localStorage.removeItem('sn_token');
    localStorage.removeItem('sn_user');
    localStorage.removeItem('sn_org');
    localStorage.removeItem('sn_org_id');
    localStorage.removeItem('sn_membership');
    localStorage.removeItem('sn_permissions');
    localStorage.removeItem('sn_trial_status');
  };

  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentOrg,
        currentMembership,
        workspaces,
        permissions,
        trialStatus,
        isSuperAdmin,
        isLoading,
        can,
        login,
        masterLogin,
        register,
        logout,
        switchOrganization,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
