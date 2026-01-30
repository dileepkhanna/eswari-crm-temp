import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  BellOff, 
  Maximize2, 
  Minimize2,
  Clock,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuickSettingsWidget() {
  const { theme, setTheme } = useTheme();
  
  // Quick settings state
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('staff_push_notifications') !== 'false';
  });
  
  const [compactView, setCompactView] = useState(() => {
    return localStorage.getItem('compactView') === 'true';
  });
  
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem('staff_auto_refresh_interval') || '30';
  });

  const handleToggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const handleToggleNotifications = (checked: boolean) => {
    setNotifications(checked);
    localStorage.setItem('staff_push_notifications', checked.toString());
    toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Quick Settings
        </CardTitle>
        <CardDescription>
          Adjust common preferences quickly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <Label className="font-medium">Dark Mode</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDarkMode}
            className="h-8"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <Label className="font-medium">Notifications</Label>
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={handleToggleNotifications}
          />
        </div>

        {/* Compact View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {compactView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <Label className="font-medium">Compact View</Label>
          </div>
          <Switch
            checked={compactView}
            onCheckedChange={handleToggleCompactView}
          />
        </div>

        {/* Auto Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <Label className="font-medium">Auto Refresh</Label>
          </div>
          <Select value={autoRefresh} onValueChange={handleAutoRefreshChange}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1m</SelectItem>
              <SelectItem value="300">5m</SelectItem>
              <SelectItem value="0">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Link to Full Settings */}
        <div className="pt-2 border-t">
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link to="/staff/settings">
              <Settings className="w-4 h-4 mr-2" />
              All Settings
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}