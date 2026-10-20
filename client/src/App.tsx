import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CopilotProvider } from './context/CopilotContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { LeadDetailPage } from './pages/leads/LeadDetailPage';
import { DealsKanbanPage } from './pages/deals/DealsKanbanPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { CampaignsPage } from './pages/campaigns/CampaignsPage';
import { AiCenterPage } from './pages/ai-center/AiCenterPage';
import { WorkflowsPage } from './pages/workflows/WorkflowsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
import { TeamPage } from './pages/team/TeamPage';
import { BillingPage } from './pages/billing/BillingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { RolesPermissionsPage } from './pages/settings/RolesPermissionsPage';

// Super Admin Master Portal Pages
import { MasterLoginPage } from './pages/master/MasterLoginPage';
import { MasterLayout } from './pages/master/MasterLayout';
import { MasterDashboardPage } from './pages/master/MasterDashboardPage';
import { MasterOrganizationsPage } from './pages/master/MasterOrganizationsPage';
import { MasterPlansPage } from './pages/master/MasterPlansPage';
import { MasterSubscriptionsPage } from './pages/master/MasterSubscriptionsPage';
import { MasterAuditLogsPage } from './pages/master/MasterAuditLogsPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080C16] flex items-center justify-center text-cyan-400 font-mono text-xs">
        Initializing SwordNex AI Security Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Super Admin Protected Route Component
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080C16] flex items-center justify-center text-cyan-400 font-mono text-xs">
        Verifying Master Admin Authorization...
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/swordnex-master/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CopilotProvider>
          <Routes>
            {/* Super Admin Master Portal Routes */}
            <Route path="/swordnex-master/login" element={<MasterLoginPage />} />
            <Route
              path="/swordnex-master"
              element={
                <SuperAdminRoute>
                  <MasterLayout />
                </SuperAdminRoute>
              }
            >
              <Route index element={<Navigate to="/swordnex-master/dashboard" replace />} />
              <Route path="dashboard" element={<MasterDashboardPage />} />
              <Route path="organizations" element={<MasterOrganizationsPage />} />
              <Route path="plans" element={<MasterPlansPage />} />
              <Route path="subscriptions" element={<MasterSubscriptionsPage />} />
              <Route path="audit-logs" element={<MasterAuditLogsPage />} />
            </Route>

            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected CRM App Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/:id" element={<LeadDetailPage />} />
              <Route path="deals" element={<DealsKanbanPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="ai-center" element={<AiCenterPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="settings/subscription" element={<BillingPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/roles-permissions" element={<RolesPermissionsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CopilotProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
