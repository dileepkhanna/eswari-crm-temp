import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useTheme } from '@/contexts/ThemeContext';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { 
  User, 
  Bell, 
  Palette, 
  Save, 
  Loader2, 
  Lock,
  Moon,
  Sun
} from 'lucide-react';

function StaffSettings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Profile settings
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(() => {
    return localStorage.getItem('staff_email_notifications') !== 'false';
  });
  const [pushNotifications, setPushNotifications] = useState(() => {
    return localStorage.getItem('staff_push_notifications') !== 'false';
  });

  // Appearance settings
  const [compactView, setCompactView] = useState(() => {
    return localStorage.getItem('compactView') === 'true';
  });

  // Initialize form fields when user data is available
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ');
      setName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error('User not loaded. Please refresh the page.');
      return;
    }
    
    setIsSavingProfile(true);
    try {
      const profileData = {
        first_name: name.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      };

      const response = await apiClient.updateProfile(profileData);
      await refreshUser();
      
      toast.success(response.message || 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
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
      toast.error('Password must be at least 8 characters');
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
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('staff_email_notifications', emailNotifications.toString());
    localStorage.setItem('staff_push_notifications', pushNotifications.toString());
    toast.success('Notification preferences saved!');
  };

  const handleSaveAppearance = () => {
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
    toast.success(`Switched to ${checked ? 'dark' : 'light'} mode`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employee Settings</h1>
        <p className="text-muted-foreground">Manage your personal preferences and account settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
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
                <Avatar className="w-20 h-20">
                  <AvatarImage src={undefined} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {user?.name?.charAt(0) || user?.userId?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                  <p className="text-xs text-muted-foreground mt-1">Employee ID: {user?.userId}</p>
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
                    disabled
                    className="bg-muted"
                    placeholder="Email cannot be changed"
                  />
                  <p className="text-xs text-muted-foreground">Contact your administrator to change your email</p>
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
              
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Change your password and manage security preferences
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
              
              <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Change Password
              </Button>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Security Tips</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Use at least 8 characters with a mix of letters, numbers, and symbols</p>
                  <p>• Don't reuse passwords from other accounts</p>
                  <p>• Contact your administrator if you forget your password</p>
                </div>
              </div>
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
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <div>
                      <Label className="font-medium">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                    </div>
                  </div>
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={handleToggleDarkMode}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Compact View</Label>
                    <p className="text-sm text-muted-foreground">Reduce spacing for more content on screen</p>
                  </div>
                  <Switch 
                    checked={compactView} 
                    onCheckedChange={setCompactView}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveAppearance}>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch 
                    checked={emailNotifications} 
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                  </div>
                  <Switch 
                    checked={pushNotifications} 
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveNotifications}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StaffSettings;