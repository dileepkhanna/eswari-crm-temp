import { useState, useRef, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useTheme } from '@/contexts/ThemeContext';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { User, Bell, Shield, Palette, Save, Camera, Loader2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  // Profile settings
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initialize form fields when user data is available
  useEffect(() => {
    if (user) {
      // Parse the name field to get first and last names
      const nameParts = (user.name || '').split(' ');
      setName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [leadAlerts, setLeadAlerts] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [leaveUpdates, setLeaveUpdates] = useState(true);
  
  // Appearance settings
  const [compactView, setCompactView] = useState(() => {
    return localStorage.getItem('compactView') === 'true';
  });

  // Apply compact view on component mount
  useEffect(() => {
    const root = document.documentElement;
    if (compactView) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
  }, [compactView]);
  
  // Security settings (only for admin)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Account deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adminPasswordForDeletion, setAdminPasswordForDeletion] = useState('');

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    let feedback = [];
    
    if (password.length >= 8) score += 1;
    else feedback.push('at least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('uppercase letters');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('numbers');
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('special characters');
    
    const strength = {
      0: { text: 'Very Weak', color: 'text-red-500' },
      1: { text: 'Weak', color: 'text-red-400' },
      2: { text: 'Fair', color: 'text-yellow-500' },
      3: { text: 'Good', color: 'text-blue-500' },
      4: { text: 'Strong', color: 'text-green-500' },
      5: { text: 'Very Strong', color: 'text-green-600' }
    };
    
    return {
      score,
      text: strength[score as keyof typeof strength].text,
      color: strength[score as keyof typeof strength].color,
      feedback: feedback.length > 0 ? `Missing: ${feedback.join(', ')}` : 'Good password!'
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // TODO: Implement file upload API in Django backend
      // const fileExt = file.name.split('.').pop();
      // const fileName = `${user?.id || 'user'}-${Date.now()}.${fileExt}`;
      // const filePath = `avatars/${fileName}`;

      // const { error: uploadError } = await supabase.storage
      //   .from('profile-pictures')
      //   .upload(filePath, file, { upsert: true });

      // if (uploadError) throw uploadError;

      // const { data: { publicUrl } } = supabase.storage
      //   .from('profile-pictures')
      //   .getPublicUrl(filePath);

      // setAvatarUrl(publicUrl);
      toast.success('Profile picture upload not implemented yet');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSavingProfile(true);
    try {
      const profileData = {
        first_name: name.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
      };

      const response = await apiClient.updateProfile(profileData);
      
      // Refresh user data in auth context
      await refreshUser();
      
      toast.success(response.message || 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved!');
  };

  const handleSaveAppearance = () => {
    // Save compact view to localStorage
    localStorage.setItem('compactView', compactView.toString());
    
    // Apply compact view styles
    const root = document.documentElement;
    if (compactView) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
    
    toast.success('Appearance settings saved!');
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleToggleCompactView = (checked: boolean) => {
    setCompactView(checked);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (passwordStrength.score < 2) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const response = await apiClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success(response.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      // Parse error details for better user feedback
      let errorMessage = 'Failed to change password';
      
      if (error.message && error.message.includes('details:')) {
        try {
          const detailsStart = error.message.indexOf('details:') + 8;
          const detailsJson = error.message.substring(detailsStart);
          const details = JSON.parse(detailsJson);
          
          if (details.details && Array.isArray(details.details)) {
            errorMessage = details.details.join(' ');
          } else if (details.error) {
            errorMessage = details.error;
          }
        } catch (parseError) {
          console.error('Error parsing error details:', parseError);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!adminPasswordForDeletion) {
      toast.error('Please enter your admin password to confirm account deletion');
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      const response = await apiClient.deleteAccount(adminPasswordForDeletion);
      
      toast.success(response.message);
      
      // Show system reset summary
      const deletedData = response.deleted_data;
      const totalDeleted = deletedData.total_records_deleted || 0;
      
      if (totalDeleted > 0) {
        const summary = [];
        if (deletedData.users > 0) summary.push(`${deletedData.users} users`);
        if (deletedData.leads > 0) summary.push(`${deletedData.leads} leads`);
        if (deletedData.tasks > 0) summary.push(`${deletedData.tasks} tasks`);
        if (deletedData.projects > 0) summary.push(`${deletedData.projects} projects`);
        if (deletedData.customers > 0) summary.push(`${deletedData.customers} customers`);
        if (deletedData.leaves > 0) summary.push(`${deletedData.leaves} leave requests`);
        if (deletedData.announcements > 0) summary.push(`${deletedData.announcements} announcements`);
        if (deletedData.holidays > 0) summary.push(`${deletedData.holidays} holidays`);
        
        toast.info(`System Reset Complete: ${totalDeleted} total records deleted`, {
          description: summary.length > 0 ? summary.join(', ') : 'All data cleared',
          duration: 10000, // Show for 10 seconds
        });
      }
      
      // Clear tokens and redirect to login
      await logout();
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      let errorMessage = 'Failed to delete account';
      if (error.message && error.message.includes('details:')) {
        try {
          const detailsStart = error.message.indexOf('details:') + 8;
          const detailsJson = error.message.substring(detailsStart);
          const details = JSON.parse(detailsJson);
          
          if (details.error) {
            errorMessage = details.error;
          }
        } catch (parseError) {
          console.error('Error parsing error details:', parseError);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setAdminPasswordForDeletion('');
    }
  };

  // Determine available tabs based on role
  const availableTabs = isAdmin 
    ? ['profile', 'notifications', 'appearance', 'security']
    : ['notifications', 'appearance'];

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Settings" subtitle="Manage your account preferences" />
      
      <main className="p-6">
        <Tabs defaultValue={availableTabs[0]} className="space-y-6">
          <TabsList className={`grid w-full max-w-2xl ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {isAdmin && (
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab - Only for Admin */}
          {isAdmin && (
            <TabsContent value="profile">
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
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <Avatar className="w-20 h-20 cursor-pointer" onClick={handleAvatarClick}>
                        <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                        <AvatarFallback className="gradient-primary text-white text-2xl font-bold">
                          {user?.name?.charAt(0) || user?.userId?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleAvatarClick}
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">Click avatar to upload new picture</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveProfile} className="gradient-primary" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch 
                      id="email-notifications"
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-notifications" className="font-medium">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                    </div>
                    <Switch 
                      id="push-notifications"
                      checked={pushNotifications} 
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Alert Types</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="lead-alerts" className="font-medium">Lead Alerts</Label>
                          <p className="text-sm text-muted-foreground">New leads and follow-up reminders</p>
                        </div>
                        <Switch 
                          id="lead-alerts"
                          checked={leadAlerts} 
                          onCheckedChange={setLeadAlerts}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="task-reminders" className="font-medium">Task Reminders</Label>
                          <p className="text-sm text-muted-foreground">Task deadlines and updates</p>
                        </div>
                        <Switch 
                          id="task-reminders"
                          checked={taskReminders} 
                          onCheckedChange={setTaskReminders}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="leave-updates" className="font-medium">Leave Updates</Label>
                          <p className="text-sm text-muted-foreground">Leave request approvals and rejections</p>
                        </div>
                        <Switch 
                          id="leave-updates"
                          checked={leaveUpdates} 
                          onCheckedChange={setLeaveUpdates}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveNotifications} className="gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance Settings
                </CardTitle>
                <CardDescription>
                  Customize how the application looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                    </div>
                    <Switch 
                      id="dark-mode"
                      checked={theme === 'dark'} 
                      onCheckedChange={handleToggleDarkMode}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="compact-view" className="font-medium">Compact View</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                    </div>
                    <Switch 
                      id="compact-view"
                      checked={compactView} 
                      onCheckedChange={handleToggleCompactView}
                    />
                  </div>
                </div>
                
                <Button onClick={handleSaveAppearance} className="gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab - Only for Admin */}
          {isAdmin && (
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your password and security options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input 
                        id="current-password" 
                        type="password"
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input 
                        id="new-password" 
                        type="password"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      {newPassword && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Strength:</span>
                            <span className={`text-xs font-medium ${passwordStrength.color}`}>
                              {passwordStrength.text}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                passwordStrength.score <= 1 ? 'bg-red-500' :
                                passwordStrength.score <= 2 ? 'bg-yellow-500' :
                                passwordStrength.score <= 3 ? 'bg-blue-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{passwordStrength.feedback}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Password requirements:
                        <br />• At least 8 characters long
                        <br />• Should not be too similar to your name or email
                        <br />• Should not be a common password
                        <br />• Should include a mix of letters and numbers
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input 
                        id="confirm-password" 
                        type="password"
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleChangePassword} className="gradient-primary" disabled={isChangingPassword}>
                    {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                    Change Password
                  </Button>

                  {/* Delete Account Section */}
                  <div className="border-t pt-6 mt-6">
                    <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your admin account and perform a COMPLETE SYSTEM RESET. 
                      This will delete ALL data from the entire CRM system and return it to initial state.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Reset Entire System
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              ⚠️ COMPLETE SYSTEM RESET
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="font-medium text-destructive mb-2">⚠️ WARNING: COMPLETE SYSTEM RESET!</div>
                <div className="text-sm">
                  You are about to permanently delete your admin account and perform a COMPLETE SYSTEM RESET. 
                  This will delete ALL data from the entire CRM system, not just your data.
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-2 text-destructive">ALL of the following data will be permanently deleted:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    <li>ALL user accounts (admin, managers, employees)</li>
                    <li>ALL leads from all users</li>
                    <li>ALL tasks from all users</li>
                    <li>ALL projects from all users</li>
                    <li>ALL customers from all users</li>
                  </ul>
                  <ul className="list-disc list-inside space-y-1">
                    <li>ALL leave requests from all users</li>
                    <li>ALL announcements from all users</li>
                    <li>ALL activity logs from all users</li>
                    <li>ALL call allocations from all users</li>
                    <li>ALL holidays and system data</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  <strong>COMPLETE SYSTEM RESET:</strong> This will return the CRM to its initial state as if it was just installed. 
                  You will need to set up a new admin account to use the system again.
                </div>
              </div>
              
              <div className="font-medium text-destructive">
                Enter your admin password to confirm this COMPLETE SYSTEM RESET:
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password-confirm">Admin Password</Label>
              <Input
                id="admin-password-confirm"
                type="password"
                value={adminPasswordForDeletion}
                onChange={(e) => setAdminPasswordForDeletion(e.target.value)}
                placeholder="Enter your admin password to confirm SYSTEM RESET"
                className="border-destructive focus:border-destructive"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setAdminPasswordForDeletion('');
                setShowDeleteDialog(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!adminPasswordForDeletion || isDeletingAccount}
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  RESETTING SYSTEM...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  RESET ENTIRE SYSTEM
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
