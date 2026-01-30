import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

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
  id: 'default',
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
    console.log('🎨 Applying settings:', s); // Debug log
    
    const root = document.documentElement;
    
    // Apply primary color and related variables
    if (s.primary_color) {
      root.style.setProperty('--primary', s.primary_color);
      // Update primary gradient
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${s.primary_color}) 0%, hsl(${s.primary_color}) 100%)`);
      console.log('🎨 Set --primary to:', s.primary_color);
    }
    
    // Apply accent color and related variables
    if (s.accent_color) {
      root.style.setProperty('--accent', s.accent_color);
      root.style.setProperty('--sidebar-primary', s.accent_color);
      root.style.setProperty('--sidebar-ring', s.accent_color);
      // Update accent gradient
      root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${s.accent_color}) 0%, hsl(${s.accent_color}) 100%)`);
      console.log('🎨 Set --accent to:', s.accent_color);
    }
    
    // Apply sidebar color and related variables
    if (s.sidebar_color) {
      root.style.setProperty('--sidebar-background', s.sidebar_color);
      // Update gradient sidebar to use the new color
      const [h, s_val, l_val] = s.sidebar_color.split(' ');
      const lightness = parseInt(l_val.replace('%', ''));
      const darkerLightness = Math.max(lightness - 5, 0); // Make it 5% darker for gradient
      const gradientColor = `${h} ${s_val} ${darkerLightness}%`;
      root.style.setProperty('--gradient-sidebar', `linear-gradient(180deg, hsl(${s.sidebar_color}) 0%, hsl(${gradientColor}) 100%)`);
      console.log('🎨 Set --sidebar-background to:', s.sidebar_color);
    }
    
    // CRITICAL FIX: Force Tailwind CSS to recognize the new colors
    const forceColorUpdate = () => {
      // Remove old dynamic style if exists
      const oldDynamicStyle = document.getElementById('dynamic-color-overrides');
      if (oldDynamicStyle) {
        oldDynamicStyle.remove();
      }
      
      // Create comprehensive CSS overrides that force Tailwind classes to use new colors
      const dynamicCSS = `
        /* Primary color overrides */
        .bg-primary { background-color: hsl(${s.primary_color}) !important; }
        .text-primary { color: hsl(${s.primary_color}) !important; }
        .border-primary { border-color: hsl(${s.primary_color}) !important; }
        .ring-primary { --tw-ring-color: hsl(${s.primary_color}) !important; }
        .btn-primary { 
          background-color: hsl(${s.primary_color}) !important; 
          color: hsl(var(--primary-foreground)) !important;
        }
        .btn-primary:hover { 
          background-color: hsl(${s.primary_color} / 0.9) !important; 
        }
        
        /* Accent color overrides */
        .bg-accent { background-color: hsl(${s.accent_color}) !important; }
        .text-accent { color: hsl(${s.accent_color}) !important; }
        .border-accent { border-color: hsl(${s.accent_color}) !important; }
        .ring-accent { --tw-ring-color: hsl(${s.accent_color}) !important; }
        .btn-accent { 
          background: linear-gradient(135deg, hsl(${s.accent_color}) 0%, hsl(${s.accent_color}) 100%) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        .btn-accent:hover { 
          opacity: 0.9 !important;
        }
        
        /* Sidebar color overrides */
        .glass-sidebar { 
          background: linear-gradient(180deg, hsl(${s.sidebar_color}) 0%, hsl(${s.sidebar_color} / 0.95) 100%) !important;
        }
        .bg-sidebar { background-color: hsl(${s.sidebar_color}) !important; }
        .text-sidebar { color: hsl(var(--sidebar-foreground)) !important; }
        
        /* Navigation link overrides */
        .nav-link-active { 
          background-color: hsl(${s.accent_color} / 0.15) !important;
          color: hsl(${s.accent_color}) !important;
        }
        .nav-link:hover { 
          background-color: hsl(${s.accent_color} / 0.1) !important;
        }
        
        /* Status and badge overrides */
        .status-interested { 
          background-color: hsl(${s.primary_color} / 0.15) !important;
          color: hsl(${s.primary_color}) !important;
          border-color: hsl(${s.primary_color} / 0.3) !important;
        }
        
        /* Gradient overrides */
        .gradient-primary { 
          background: linear-gradient(135deg, hsl(${s.primary_color}) 0%, hsl(${s.primary_color}) 100%) !important;
        }
        .gradient-accent { 
          background: linear-gradient(135deg, hsl(${s.accent_color}) 0%, hsl(${s.accent_color}) 100%) !important;
        }
        
        /* Form and input overrides */
        .focus\\:ring-primary:focus { --tw-ring-color: hsl(${s.primary_color} / 0.2) !important; }
        .focus\\:border-primary:focus { border-color: hsl(${s.primary_color}) !important; }
        
        /* Card and component overrides */
        .stat-card:hover { 
          box-shadow: 0 10px 30px -10px hsl(${s.primary_color} / 0.2) !important;
        }
        
        /* Force all elements with these classes to update immediately */
        [class*="bg-primary"], [class*="text-primary"], [class*="border-primary"],
        [class*="bg-accent"], [class*="text-accent"], [class*="border-accent"],
        [class*="bg-sidebar"], [class*="text-sidebar"],
        .btn-primary, .btn-accent, .nav-link, .nav-link-active,
        .glass-sidebar, .gradient-primary, .gradient-accent {
          transition: all 0.3s ease !important;
        }
      `;
      
      // Inject the dynamic CSS
      const styleElement = document.createElement('style');
      styleElement.id = 'dynamic-color-overrides';
      styleElement.textContent = dynamicCSS;
      document.head.appendChild(styleElement);
      
      console.log('🎨 Dynamic CSS overrides applied');
    };
    
    // Apply color updates immediately
    forceColorUpdate();
    
    // Force multiple style recalculations to ensure changes take effect
    const forceStyleRecalculation = () => {
      // Method 1: Force reflow
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
      
      // Method 2: Add and remove a class to force style recalculation
      document.documentElement.classList.add('force-recalc');
      setTimeout(() => {
        document.documentElement.classList.remove('force-recalc');
      }, 10);
      
      // Method 3: Trigger a repaint on all color-related elements
      const elements = document.querySelectorAll(`
        .btn-primary, .btn-accent, 
        [class*="bg-primary"], [class*="bg-accent"], [class*="bg-sidebar"],
        [class*="text-primary"], [class*="text-accent"], [class*="text-sidebar"],
        [class*="border-primary"], [class*="border-accent"],
        .nav-link, .nav-link-active, .glass-sidebar, .gradient-primary, .gradient-accent,
        .stat-card, .status-interested, .status-pending
      `);
      elements.forEach(el => {
        const element = el as HTMLElement;
        element.style.transform = 'translateZ(0)';
        setTimeout(() => {
          element.style.transform = '';
        }, 10);
      });
    };
    
    // Apply force recalculation after a short delay
    setTimeout(forceStyleRecalculation, 50);
    // Update favicon
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (s.favicon_url) {
      console.log('🌐 Setting favicon URL:', s.favicon_url); // Debug log
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
    
    console.log('🎨 All color variables and overrides applied successfully');
    
    // Debug: Log current CSS variable values after a delay
    setTimeout(() => {
      const computedStyle = getComputedStyle(root);
      console.log('🔍 Current CSS variables after application:');
      console.log('  --primary:', computedStyle.getPropertyValue('--primary').trim());
      console.log('  --accent:', computedStyle.getPropertyValue('--accent').trim());
      console.log('  --sidebar-background:', computedStyle.getPropertyValue('--sidebar-background').trim());
      
      // Also check if dynamic overrides are present
      const dynamicStyle = document.getElementById('dynamic-color-overrides');
      console.log('🔍 Dynamic color overrides present:', !!dynamicStyle);
      if (dynamicStyle) {
        console.log('🔍 Dynamic CSS length:', dynamicStyle.textContent?.length);
      }
    }, 100);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      // Try to fetch from Django backend API
      const response = await apiClient.getAppSettings();
      
      if (response && response.id) {
        setSettings(response);
        applySettings(response);
      } else {
        // Fallback to default settings
        setSettings(defaultSettings);
        applySettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error fetching app settings:', err);
      
      // Fallback: try to load from localStorage as backup
      try {
        const savedSettings = localStorage.getItem('appSettings');
        let settingsToUse = defaultSettings;
        
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          settingsToUse = { ...defaultSettings, ...parsed };
        }
        
        setSettings(settingsToUse);
        applySettings(settingsToUse);
      } catch (localError) {
        console.error('Error loading backup settings:', localError);
        setSettings(defaultSettings);
        applySettings(defaultSettings);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    
    try {
      // Call Django backend API to update settings
      const response = await apiClient.updateAppSettings(updates);
      
      if (response && response.settings) {
        setSettings(response.settings);
        applySettings(response.settings);
        
        // Also save to localStorage as backup
        localStorage.setItem('appSettings', JSON.stringify(response.settings));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      
      // Fallback: save to localStorage only
      const newSettings = { ...settings, ...updates };
      try {
        localStorage.setItem('appSettings', JSON.stringify(newSettings));
        setSettings(newSettings);
        applySettings(newSettings);
      } catch (localError) {
        console.error('Error saving settings locally:', localError);
        throw new Error('Failed to save settings');
      }
      
      throw new Error(`Failed to save settings: ${error.message}`);
    }
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
