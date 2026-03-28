import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import { apiClient } from '@/lib/api';
import { NotificationSettings } from '@/components/NotificationSettings';
import { 
  User, 
  Moon, 
  Sun, 
  Bell, 
  BellOff, 
  Maximize2, 
  Minimize2,
  Clock,
  Save,
  Eye,
  EyeOff,
  Shield,
  Palette,
  LogOut
} from 'lucide-react';

import { logger } from '@/lib/logger';
export default function EmployeeSettings() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  
  // Appearance settings
  const [compactView, setCompactView] = useState(() => {
    return localStorage.getItem('compactView') === 'true';
  });
  
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem('staff_auto_refresh_interval') || '30';
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const handleToggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const handleToggleCompactView = (checked: boolean) => {
    setCompactView(checked);
    localStorage.setItem('compactView', checked.toString());
    
    // Apply compact view styles immediately
    const root = document.documentElement;
    if (checked) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
    
    toast.success(checked ? 'Compact view enabled' : 'Compact view disabled');
  };

  const handleAutoRefreshChange = (value: string) => {
    setAutoRefresh(value);
    localStorage.setItem('staff_auto_refresh_interval', value);
    const refreshText = value === '0' ? 'disabled' : `${value} seconds`;
    toast.success(`Auto refresh set to ${refreshText}`);
  };

  const handleProfileUpdate = async () => {
    try {
      await apiClient.updateProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      });

      toast.success('Profile updated successfully');
    } catch (error: any) {
      logger.error('Profile update error:', error);
      if (error.message?.includes('Email address is already in use')) {
        toast.error('Email address is already in use by another user');
      } else {
        toast.error(error.message || 'Failed to update profile. Please try again.');
      }
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      await apiClient.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      logger.error('Password change error:', error);
      
      // Handle specific error messages from the backend
      if (error.message?.includes('Current password is incorrect')) {
        toast.error('Current password is incorrect');
      } else if (error.message?.includes('Password validation failed')) {
        // Parse error details from the API response
        let errorMessage = 'Password validation failed. Please choose a different password.';
        
        try {
          if (error.message?.includes('details:')) {
            const detailsMatch = error.message.match(/details:\s*(\[.*?\])/);
            if (detailsMatch) {
              const parsedDetails = JSON.parse(detailsMatch[1]);
              if (Array.isArray(parsedDetails) && parsedDetails.length > 0) {
                const firstError = parsedDetails[0];
                if (firstError.includes('too similar')) {
                  errorMessage = 'Password is too similar to your personal information. Please choose a more unique password.';
                } else if (firstError.includes('too common')) {
                  errorMessage = 'This password is too common. Please choose a more unique password.';
                } else if (firstError.includes('too short')) {
                  errorMessage = 'Password must be at least 8 characters long.';
                } else if (firstError.includes('entirely numeric')) {
                  errorMessage = 'Password cannot be entirely numeric. Please include letters.';
                } else {
                  errorMessage = firstError;
                }
              }
            }
          }
        } catch (parseError) {
          logger.warn('Failed to parse error details:', parseError);
        }
        
        toast.error(errorMessage);
      } else {
        toast.error(error.message || 'Failed to change password. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Settings" subtitle="Manage your account and preferences" />
      
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Push Notifications Settings */}
        <NotificationSettings />

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
            
            <Button onClick={handleProfileUpdate} className="w-full md:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance & Behavior
            </CardTitle>
            <CardDescription>
              Customize how the application looks and behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <Label className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleDarkMode}
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </div>

            <Separator />

            {/* Compact View Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {compactView ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                <div>
                  <Label className="font-medium">Compact View</Label>
                  <p className="text-sm text-muted-foreground">Use smaller spacing and elements</p>
                </div>
              </div>
              <Switch
                checked={compactView}
                onCheckedChange={handleToggleCompactView}
              />
            </div>

            <Separator />

            {/* Auto Refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5" />
                <div>
                  <Label className="font-medium">Auto Refresh</Label>
                  <p className="text-sm text-muted-foreground">Automatically refresh data</p>
                </div>
              </div>
              <Select value={autoRefresh} onValueChange={handleAutoRefreshChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="0">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>
              Change your password and manage security settings. Choose a strong password that includes letters, numbers, and symbols. Avoid using personal information like your name, email, or phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long. Avoid using your name, email, phone, or other personal information. Include a mix of letters, numbers, and symbols.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handlePasswordChange}
              disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full md:w-auto"
            >
              <Shield className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <LogOut className="w-5 h-5" />
              Sign Out
            </CardTitle>
            <CardDescription>Sign out of your account on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => { await logout(); }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}