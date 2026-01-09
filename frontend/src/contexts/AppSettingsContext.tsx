import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend

interface AppSettings {
  id: string;
  app_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  sidebar_color: string;
  custom_css: string | null;
}

interface AppSettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  id: '',
  app_name: 'ESWARI CONNECTS',
  logo_url: null,
  favicon_url: null,
  primary_color: '152 45% 28%',
  accent_color: '45 90% 50%',
  sidebar_color: '152 35% 15%',
  custom_css: null,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySettings = useCallback((s: AppSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', s.primary_color);
    root.style.setProperty('--accent', s.accent_color);
    root.style.setProperty('--sidebar-background', s.sidebar_color);
    
    // Update favicon
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (s.favicon_url) {
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = s.favicon_url;
    }
    
    // Update page title
    document.title = s.app_name || 'ESWARI CONNECTS';
    
    // Remove old custom CSS if exists
    const oldStyle = document.getElementById('custom-app-css');
    if (oldStyle) oldStyle.remove();
    
    // Apply new custom CSS
    if (s.custom_css) {
      const style = document.createElement('style');
      style.id = 'custom-app-css';
      style.textContent = s.custom_css;
      document.head.appendChild(style);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      // TODO: Implement app settings API in Django backend
      // const { data, error } = await supabase
      //   .from('app_settings')
      //   .select('*')
      //   .limit(1)
      //   .single();

      // if (error) {
      //   console.error('Error fetching settings:', error);
      //   setSettings(defaultSettings);
      //   applySettings(defaultSettings);
      // } else if (data) {
      //   setSettings(data);
      //   applySettings(data);
      // }
      
      // Use default settings for now
      setSettings(defaultSettings);
      applySettings(defaultSettings);
    } catch (err) {
      console.error('Error:', err);
      setSettings(defaultSettings);
      applySettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings?.id) return;
    
    // TODO: Implement app settings update API in Django backend
    // const { error } = await supabase
    //   .from('app_settings')
    //   .update(updates)
    //   .eq('id', settings.id);

    // if (error) {
    //   throw error;
    // }

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    applySettings(newSettings);
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading, updateSettings, refreshSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
