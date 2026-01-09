import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextDjango";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DataProvider } from "@/contexts/DataContextDjango";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import Login from "@/pages/Login";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminProjects from "@/pages/admin/AdminProjects";
import AdminLeaves from "@/pages/admin/AdminLeaves";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminReports from "@/pages/admin/AdminReports";
import AdminBranding from "@/pages/admin/AdminBranding";

// Manager Pages
import ManagerDashboard from "@/pages/manager/ManagerDashboard";
import ManagerLeads from "@/pages/manager/ManagerLeads";
import ManagerTasks from "@/pages/manager/ManagerTasks";
import ManagerLeaves from "@/pages/manager/ManagerLeaves";
import ManagerProjects from "@/pages/manager/ManagerProjects";
import ManagerAnnouncements from "@/pages/manager/ManagerAnnouncements";

// Staff Pages
import StaffDashboard from "@/pages/staff/StaffDashboard";
import StaffLeads from "@/pages/staff/StaffLeads";
import StaffTasks from "@/pages/staff/StaffTasks";
import StaffLeaves from "@/pages/staff/StaffLeaves";
import StaffProjects from "@/pages/staff/StaffProjects";
import StaffAnnouncements from "@/pages/staff/StaffAnnouncements";

// Shared Pages
import SettingsPage from "@/pages/settings/SettingsPage";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppSettingsProvider>
        <NotificationProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="tasks" element={<AdminTasks />} />
                  <Route path="projects" element={<AdminProjects />} />
                  <Route path="leaves" element={<AdminLeaves />} />
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
                  <Route path="tasks" element={<ManagerTasks />} />
                  <Route path="projects" element={<ManagerProjects />} />
                  <Route path="leaves" element={<ManagerLeaves />} />
                  <Route path="announcements" element={<ManagerAnnouncements />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Staff Routes (for employee role) */}
                <Route path="/staff" element={<DashboardLayout requiredRole="employee" />}>
                  <Route index element={<StaffDashboard />} />
                  <Route path="leads" element={<StaffLeads />} />
                  <Route path="tasks" element={<StaffTasks />} />
                  <Route path="projects" element={<StaffProjects />} />
                  <Route path="leaves" element={<StaffLeaves />} />
                  <Route path="announcements" element={<StaffAnnouncements />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Legacy redirect: /employee -> /staff */}
                <Route path="/employee/*" element={<Navigate to="/staff" replace />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </NotificationProvider>
    </AppSettingsProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
