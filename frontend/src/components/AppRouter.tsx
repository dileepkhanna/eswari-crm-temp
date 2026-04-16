import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Pages
import Login from '@/pages/Login';
import AdminSetup from '@/pages/AdminSetup';
import Calendar from '@/pages/Calendar';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLeads from '@/pages/admin/AdminLeads';
import AdminTasks from '@/pages/admin/AdminTasks';
import AdminProjects from '@/pages/admin/AdminProjects';
import AdminLeaves from '@/pages/admin/AdminLeaves';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminActivity from '@/pages/admin/AdminActivity';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';
import AdminReports from '@/pages/admin/AdminReports';
import AdminBranding from '@/pages/admin/AdminBranding';
import AdminHolidays from '@/pages/admin/AdminHolidays';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import AdminCompanies from '@/pages/admin/AdminCompanies';
import AdminCampaigns from '@/pages/admin/AdminCampaigns';
import AdminSocialMedia from '@/pages/admin/AdminSocialMedia';
import AdminContent from '@/pages/admin/AdminContent';
import AdminEmailMarketing from '@/pages/admin/AdminEmailMarketing';
import AdminSEO from '@/pages/admin/AdminSEO';
import AdminTeam from '@/pages/admin/AdminTeam';
import AdminConversionAnalytics from '@/pages/admin/AdminConversionAnalytics';
import AdminASECustomers from '@/pages/admin/AdminASECustomers';
import AdminASELeads from '@/pages/admin/AdminASELeads';
import AdminASEActivity from '@/pages/admin/AdminASEActivity';
import AdminASEEmployees from '@/pages/admin/AdminASEEmployees';
import AdminEswariEmployees from '@/pages/admin/AdminEswariEmployees';
import AdminCapitalEmployees from '@/pages/admin/AdminCapitalEmployees';
import AdminDocumentation from '@/pages/admin/AdminDocumentation';
import AdminBirthdays from '@/pages/admin/AdminBirthdays';
import AdminPendingUsers from '@/pages/admin/AdminPendingUsers';

// Manager Pages
import ManagerDashboard from '@/pages/manager/ManagerDashboard';
import ManagerLeads from '@/pages/manager/ManagerLeads';
import ManagerTasks from '@/pages/manager/ManagerTasks';
import ManagerLeaves from '@/pages/manager/ManagerLeaves';
import ManagerProjects from '@/pages/manager/ManagerProjects';
import ManagerAnnouncements from '@/pages/manager/ManagerAnnouncements';
import ManagerHolidays from '@/pages/manager/ManagerHolidays';
import ManagerCustomers from '@/pages/manager/ManagerCustomers';
import ManagerReports from '@/pages/manager/ManagerReports';
import ManagerActivity from '@/pages/manager/ManagerActivity';
import ManagerCampaigns from '@/pages/manager/ManagerCampaigns';
import ManagerSocialMedia from '@/pages/manager/ManagerSocialMedia';
import ManagerContent from '@/pages/manager/ManagerContent';
import ManagerEmailMarketing from '@/pages/manager/ManagerEmailMarketing';
import ManagerSEO from '@/pages/manager/ManagerSEO';
import ManagerTeam from '@/pages/manager/ManagerTeam';

import ManagerConversionAnalytics from '@/pages/manager/ManagerConversionAnalytics';
import ManagerASECustomers from '@/pages/manager/ManagerASECustomers';
import ManagerASELeads from '@/pages/manager/ManagerASELeads';
import ManagerWebsites from '@/pages/manager/ManagerWebsites';
import ManagerMediaLibrary from '@/pages/manager/ManagerMediaLibrary';
import ManagerPostScheduler from '@/pages/manager/ManagerPostScheduler';
import ManagerASEProjects from '@/pages/manager/ManagerASEProjects';
import ManagerASEActivity from '@/pages/manager/ManagerASEActivity';

// Staff Pages
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffLeads from '@/pages/staff/StaffLeads';
import StaffTasks from '@/pages/staff/StaffTasks';
import StaffLeaves from '@/pages/staff/StaffLeaves';
import StaffProjects from '@/pages/staff/StaffProjects';
import StaffAnnouncements from '@/pages/staff/StaffAnnouncements';
import StaffHolidays from '@/pages/staff/StaffHolidays';
import StaffCustomers from '@/pages/staff/StaffCustomers';
import StaffCampaigns from '@/pages/staff/StaffCampaigns';
import StaffSocialMedia from '@/pages/staff/StaffSocialMedia';
import StaffContent from '@/pages/staff/StaffContent';
import StaffEmailMarketing from '@/pages/staff/StaffEmailMarketing';
import StaffASECustomers from '@/pages/staff/StaffASECustomers';
import StaffASELeads from '@/pages/staff/StaffASELeads';

import AdminCapitalCustomers from '@/pages/admin/AdminCapitalCustomers';
import AdminCapitalTasks from '@/pages/admin/AdminCapitalTasks';
import AdminCapitalLoans from '@/pages/admin/AdminCapitalLoans';
import AdminCapitalServices from '@/pages/admin/AdminCapitalServices';
import ManagerCapitalCustomers from '@/pages/manager/ManagerCapitalCustomers';
import ManagerCapitalTasks from '@/pages/manager/ManagerCapitalTasks';
import ManagerCapitalLoans from '@/pages/manager/ManagerCapitalLoans';
import ManagerCapitalServices from '@/pages/manager/ManagerCapitalServices';
import StaffCapitalCustomers from '@/pages/staff/StaffCapitalCustomers';
import StaffCapitalTasks from '@/pages/staff/StaffCapitalTasks';
import StaffCapitalLoans from '@/pages/staff/StaffCapitalLoans';
import StaffCapitalServices from '@/pages/staff/StaffCapitalServices';
import CapitalDashboard from '@/pages/capital/CapitalDashboard';
import CapitalReports from '@/pages/capital/CapitalReports';
import CapitalActivity from '@/pages/capital/CapitalActivity';
import CapitalTools from '@/pages/capital/CapitalTools';
import DashboardIndex from '@/components/DashboardIndex';

import StaffConversionAnalytics from '@/pages/staff/StaffConversionAnalytics';

// HR Pages
import HRDashboard from '@/pages/hr/HRDashboard';
import HREmployees from '@/pages/hr/HREmployees';
import HRLeaves from '@/pages/hr/HRLeaves';
import HRHolidays from '@/pages/hr/HRHolidays';
import HRAnnouncements from '@/pages/hr/HRAnnouncements';
import HRReports from '@/pages/hr/HRReports';
import HRBirthdays from '@/pages/hr/HRBirthdays';

// Shared Pages
import SettingsPage from '@/pages/settings/SettingsPage';
import EmployeeSettings from '@/pages/staff/EmployeeSettings';
import NotFound from '@/pages/NotFound';
import InviteRegister from '@/pages/InviteRegister';

const AppRouter = () => {
  const { adminExists, isLoading } = useAuth();

  // Show loading while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no admin exists, redirect to admin setup
  if (adminExists === false) {
    return (
      <Routes>
        <Route path="/setup" element={<AdminSetup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  // Normal app routes when admin exists - redirect root to login
  return (
    <Routes>
      {/* Public Routes - redirect root to login when admin exists */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<InviteRegister />} />
      
      {/* Redirect setup to login if admin already exists */}
      <Route path="/setup" element={<Navigate to="/login" replace />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
        <Route index element={<DashboardIndex adminEl={<AdminDashboard />} managerEl={<AdminDashboard />} staffEl={<AdminDashboard />} basePath="/admin" />} />
        <Route path="ase-customers" element={<AdminASECustomers />} />
        <Route path="ase-leads" element={<AdminASELeads />} />
        <Route path="ase-reports" element={<AdminReports />} />
        <Route path="ase-activity" element={<AdminASEActivity />} />
        <Route path="ase-employees" element={<AdminASEEmployees />} />
        <Route path="eswari-employees" element={<AdminEswariEmployees />} />
        <Route path="capital-employees" element={<AdminCapitalEmployees />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="social-media" element={<AdminSocialMedia />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="email-marketing" element={<AdminEmailMarketing />} />
        <Route path="seo" element={<AdminSEO />} />
        <Route path="team" element={<AdminTeam />} />
        <Route path="leads" element={<AdminLeads />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="capital-customers" element={<AdminCapitalCustomers />} />
        <Route path="capital-dashboard" element={<CapitalDashboard />} />
        <Route path="capital-reports" element={<CapitalReports />} />
        <Route path="capital-activity" element={<CapitalActivity />} />
        <Route path="capital-tools" element={<CapitalTools />} />
        <Route path="capital-tasks" element={<AdminCapitalTasks />} />
        <Route path="capital-loans" element={<AdminCapitalLoans />} />
        <Route path="capital-services" element={<AdminCapitalServices />} />
        <Route path="conversion-analytics" element={<AdminConversionAnalytics />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="holidays" element={<AdminHolidays />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="pending-users" element={<AdminPendingUsers />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="branding" element={<AdminBranding />} />
        <Route path="activity" element={<AdminActivity defaultCompanyId="2" />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="documentation" element={<AdminDocumentation />} />
        <Route path="birthdays" element={<AdminBirthdays />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Manager Routes */}
      <Route path="/manager" element={<DashboardLayout requiredRole="manager" />}>
        <Route index element={<DashboardIndex adminEl={<ManagerDashboard />} managerEl={<ManagerDashboard />} staffEl={<ManagerDashboard />} basePath="/manager" />} />
        <Route path="ase-customers" element={<ManagerASECustomers />} />
        <Route path="ase-leads" element={<ManagerASELeads />} />
        <Route path="ase-activity" element={<ManagerASEActivity />} />
        <Route path="ase-reports" element={<ManagerReports />} />
        <Route path="websites" element={<ManagerWebsites />} />
        <Route path="media-library" element={<ManagerMediaLibrary />} />
        <Route path="post-scheduler" element={<ManagerPostScheduler />} />
        <Route path="ase-projects" element={<ManagerASEProjects />} />
        <Route path="campaigns" element={<ManagerCampaigns />} />
        <Route path="social-media" element={<ManagerSocialMedia />} />
        <Route path="content" element={<ManagerContent />} />
        <Route path="email-marketing" element={<ManagerEmailMarketing />} />
        <Route path="seo" element={<ManagerSEO />} />
        <Route path="team" element={<ManagerTeam />} />
        <Route path="leads" element={<ManagerLeads />} />
        <Route path="customers" element={<ManagerCustomers />} />
        <Route path="capital-customers" element={<ManagerCapitalCustomers />} />
        <Route path="capital-dashboard" element={<CapitalDashboard />} />
        <Route path="capital-reports" element={<CapitalReports />} />
        <Route path="capital-activity" element={<CapitalActivity />} />
        <Route path="capital-tools" element={<CapitalTools />} />
        <Route path="capital-tasks" element={<ManagerCapitalTasks />} />
        <Route path="capital-loans" element={<ManagerCapitalLoans />} />
        <Route path="capital-services" element={<ManagerCapitalServices />} />
        <Route path="conversion-analytics" element={<ManagerConversionAnalytics />} />
        <Route path="tasks" element={<ManagerTasks />} />
        <Route path="projects" element={<ManagerProjects />} />
        <Route path="leaves" element={<ManagerLeaves />} />
        <Route path="holidays" element={<ManagerHolidays />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="announcements" element={<ManagerAnnouncements />} />
        <Route path="reports" element={<ManagerReports />} />
        <Route path="activity" element={<ManagerActivity />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Staff Routes (for employee role) */}
      <Route path="/staff" element={<DashboardLayout requiredRole="employee" />}>
        <Route index element={<DashboardIndex adminEl={<StaffDashboard />} managerEl={<StaffDashboard />} staffEl={<StaffDashboard />} basePath="/staff" />} />
        <Route path="ase-customers" element={<StaffASECustomers />} />
        <Route path="ase-leads" element={<StaffASELeads />} />
        <Route path="campaigns" element={<StaffCampaigns />} />
        <Route path="social-media" element={<StaffSocialMedia />} />
        <Route path="content" element={<StaffContent />} />
        <Route path="email-marketing" element={<StaffEmailMarketing />} />
        <Route path="leads" element={<StaffLeads />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="capital-customers" element={<StaffCapitalCustomers />} />
        <Route path="capital-dashboard" element={<CapitalDashboard />} />
        <Route path="capital-reports" element={<CapitalReports />} />
        <Route path="capital-activity" element={<CapitalActivity />} />
        <Route path="capital-tools" element={<CapitalTools />} />
        <Route path="capital-tasks" element={<StaffCapitalTasks />} />
        <Route path="capital-loans" element={<StaffCapitalLoans />} />
        <Route path="capital-services" element={<StaffCapitalServices />} />
        <Route path="conversion-analytics" element={<StaffConversionAnalytics />} />
        <Route path="tasks" element={<StaffTasks />} />
        <Route path="projects" element={<StaffProjects />} />
        <Route path="leaves" element={<StaffLeaves />} />
        <Route path="holidays" element={<StaffHolidays />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="announcements" element={<StaffAnnouncements />} />
        <Route path="settings" element={<EmployeeSettings />} />
      </Route>

      {/* HR Routes */}
      <Route path="/hr" element={<DashboardLayout requiredRole="hr" />}>
        <Route index element={<HRDashboard />} />
        <Route path="employees" element={<HREmployees />} />
        <Route path="leaves" element={<HRLeaves />} />
        <Route path="holidays" element={<HRHolidays />} />
        <Route path="announcements" element={<HRAnnouncements />} />
        <Route path="birthdays" element={<HRBirthdays />} />
        <Route path="reports" element={<HRReports />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Legacy redirect: /employee -> /staff */}
      <Route path="/employee/*" element={<Navigate to="/staff" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;