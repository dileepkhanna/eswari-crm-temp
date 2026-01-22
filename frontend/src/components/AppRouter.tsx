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

// Staff Pages
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffLeads from '@/pages/staff/StaffLeads';
import StaffTasks from '@/pages/staff/StaffTasks';
import StaffLeaves from '@/pages/staff/StaffLeaves';
import StaffProjects from '@/pages/staff/StaffProjects';
import StaffAnnouncements from '@/pages/staff/StaffAnnouncements';
import StaffHolidays from '@/pages/staff/StaffHolidays';
import StaffCustomers from '@/pages/staff/StaffCustomers';

// Shared Pages
import SettingsPage from '@/pages/settings/SettingsPage';
import NotFound from '@/pages/NotFound';

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
      
      {/* Redirect setup to login if admin already exists */}
      <Route path="/setup" element={<Navigate to="/login" replace />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="leads" element={<AdminLeads />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="holidays" element={<AdminHolidays />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="branding" element={<AdminBranding />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Manager Routes */}
      <Route path="/manager" element={<DashboardLayout requiredRole="manager" />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="leads" element={<ManagerLeads />} />
        <Route path="customers" element={<ManagerCustomers />} />
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
        <Route index element={<StaffDashboard />} />
        <Route path="leads" element={<StaffLeads />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="tasks" element={<StaffTasks />} />
        <Route path="projects" element={<StaffProjects />} />
        <Route path="leaves" element={<StaffLeaves />} />
        <Route path="holidays" element={<StaffHolidays />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="announcements" element={<StaffAnnouncements />} />
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