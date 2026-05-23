import React, { useState, useRef, useEffect } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { apiClient } from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Upload, Palette, Code, Building2, Loader2, Globe, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPickerField } from '@/components/ui/color-picker';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
const AdminBranding = () => {
  const { settings, updateSettings, isLoading, refreshSettings } = useAppSettings();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  
  // Company-specific branding state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    app_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '',
    accent_color: '',
    sidebar_color: '',
    custom_css: '',
  });

  // Real-time color preview with robust style recalculation
  useEffect(() => {
    if (formData.primary_color || formData.accent_color || formData.sidebar_color) {
      const root = document.documentElement;
      
      // Apply primary color preview
      if (formData.primary_color) {
        root.style.setProperty('--primary', formData.primary_color);
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${formData.primary_color}) 0%, hsl(${formData.primary_color}) 100%)`);
        logger.log('🎨 Preview: Set --primary to:', formData.primary_color);
      }
      
      // Apply accent color preview
      if (formData.accent_color) {
        root.style.setProperty('--accent', formData.accent_color);
        root.style.setProperty('--sidebar-primary', formData.accent_color);
        root.style.setProperty('--sidebar-ring', formData.accent_color);
        root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${formData.accent_color}) 0%, hsl(${formData.accent_color}) 100%)`);
        logger.log('🎨 Preview: Set --accent to:', formData.accent_color);
      }
      
      // Apply sidebar color preview
      if (formData.sidebar_color) {
        root.style.setProperty('--sidebar-background', formData.sidebar_color);
        // Update gradient sidebar
        try {
          const parts = formData.sidebar_color.split(' ');
          if (parts.length === 3 && parts[2].includes('%')) {
            const [h, s_val, l_val] = parts;
            const lightness = parseInt(l_val.replace('%', ''));
            const darkerLightness = Math.max(lightness - 5, 0);
            const gradientColor = `${h} ${s_val} ${darkerLightness}%`;
            root.style.setProperty('--gradient-sidebar', `linear-gradient(180deg, hsl(${formData.sidebar_color}) 0%, hsl(${gradientColor}) 100%)`);
          }
          logger.log('🎨 Preview: Set --sidebar-background to:', formData.sidebar_color);
        } catch (error) {
          logger.warn('Error updating sidebar gradient:', error);
        }
      }
      
      // CRITICAL FIX: Force Tailwind CSS to recognize the new colors for preview
      const forcePreviewColorUpdate = () => {
        // Remove old preview style if exists
        const oldPreviewStyle = document.getElementById('preview-color-overrides');
        if (oldPreviewStyle) {
          oldPreviewStyle.remove();
        }
        
        // Create comprehensive CSS overrides for preview
        const previewCSS = `
          /* Primary color preview overrides */
          .bg-primary { background-color: hsl(${formData.primary_color || '152 45% 28%'}) !important; }
          .text-primary { color: hsl(${formData.primary_color || '152 45% 28%'}) !important; }
          .border-primary { border-color: hsl(${formData.primary_color || '152 45% 28%'}) !important; }
          .btn-primary { 
            background-color: hsl(${formData.primary_color || '152 45% 28%'}) !important; 
            color: hsl(var(--primary-foreground)) !important;
          }
          .btn-primary:hover { 
            background-color: hsl(${formData.primary_color || '152 45% 28%'} / 0.9) !important; 
          }
          
          /* Accent color preview overrides */
          .bg-accent { background-color: hsl(${formData.accent_color || '45 90% 50%'}) !important; }
          .text-accent { color: hsl(${formData.accent_color || '45 90% 50%'}) !important; }
          .border-accent { border-color: hsl(${formData.accent_color || '45 90% 50%'}) !important; }
          .btn-accent { 
            background: linear-gradient(135deg, hsl(${formData.accent_color || '45 90% 50%'}) 0%, hsl(${formData.accent_color || '45 90% 50%'}) 100%) !important;
            color: hsl(var(--accent-foreground)) !important;
          }
          .btn-accent:hover { 
            opacity: 0.9 !important;
          }
          
          /* Sidebar color preview overrides - only in light mode */
          :root:not(.dark) .glass-sidebar { 
            background: linear-gradient(180deg, hsl(${formData.sidebar_color || '152 35% 15%'}) 0%, hsl(${formData.sidebar_color || '152 35% 15%'} / 0.95) 100%) !important;
          }
          :root:not(.dark) .bg-sidebar { background-color: hsl(${formData.sidebar_color || '152 35% 15%'}) !important; }
          
          /* Navigation link preview overrides */
          .nav-link-active { 
            background-color: hsl(${formData.accent_color || '45 90% 50%'} / 0.15) !important;
            color: hsl(${formData.accent_color || '45 90% 50%'}) !important;
          }
          .nav-link:hover { 
            background-color: hsl(${formData.accent_color || '45 90% 50%'} / 0.1) !important;
          }
          
          /* Status and badge preview overrides */
          .status-interested { 
            background-color: hsl(${formData.primary_color || '152 45% 28%'} / 0.15) !important;
            color: hsl(${formData.primary_color || '152 45% 28%'}) !important;
            border-color: hsl(${formData.primary_color || '152 45% 28%'} / 0.3) !important;
          }
          
          /* Gradient preview overrides */
          .gradient-primary { 
            background: linear-gradient(135deg, hsl(${formData.primary_color || '152 45% 28%'}) 0%, hsl(${formData.primary_color || '152 45% 28%'}) 100%) !important;
          }
          .gradient-accent { 
            background: linear-gradient(135deg, hsl(${formData.accent_color || '45 90% 50%'}) 0%, hsl(${formData.accent_color || '45 90% 50%'}) 100%) !important;
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
        
        // Inject the preview CSS
        const styleElement = document.createElement('style');
        styleElement.id = 'preview-color-overrides';
        styleElement.textContent = previewCSS;
        document.head.appendChild(styleElement);
        
        logger.log('🎨 Preview CSS overrides applied');
      };
      
      // Apply preview color updates immediately
      forcePreviewColorUpdate();
      
      // Force comprehensive style recalculation
      const forceStyleUpdate = () => {
        // Method 1: Force reflow
        document.body.style.display = 'none';
        document.body.offsetHeight;
        document.body.style.display = '';
        
        // Method 2: Force repaint on color-related elements
        const colorElements = document.querySelectorAll(`
          .btn-primary, .btn-accent, 
          [class*="bg-primary"], [class*="bg-accent"], [class*="bg-sidebar"],
          [class*="text-primary"], [class*="text-accent"], [class*="text-sidebar"],
          [class*="border-primary"], [class*="border-accent"],
          .nav-link, .nav-link-active, .glass-sidebar, .gradient-primary, .gradient-accent,
          .stat-card, .status-interested, .status-pending
        `);
        
        colorElements.forEach(el => {
          const element = el as HTMLElement;
          element.style.transform = 'translateZ(0)';
          setTimeout(() => {
            element.style.transform = '';
          }, 10);
        });
        
        // Method 3: Add/remove class to trigger recalculation
        document.documentElement.classList.add('force-recalc');
        setTimeout(() => {
          document.documentElement.classList.remove('force-recalc');
        }, 50);
      };
      
      // Apply force update after a short delay
      setTimeout(forceStyleUpdate, 10);
    }
  }, [formData.primary_color, formData.accent_color, formData.sidebar_color]);

  useEffect(() => {
    if (settings) {
      logger.log('🖼️ Settings received in AdminBranding:', settings); // Debug log
      setFormData({
        app_name: settings.app_name || '',
        logo_url: settings.logo_url || '',
        favicon_url: settings.favicon_url || '',
        primary_color: settings.primary_color || '',
        accent_color: settings.accent_color || '',
        sidebar_color: settings.sidebar_color || '',
        custom_css: settings.custom_css || '',
      });
    }
  }, [settings]);

  // Auto-save functionality for colors
  useEffect(() => {
    if (!settings) return;
    
    // Only auto-save if colors have actually changed from the saved settings
    const colorsChanged = 
      formData.primary_color !== settings.primary_color ||
      formData.accent_color !== settings.accent_color ||
      formData.sidebar_color !== settings.sidebar_color;
    
    if (colorsChanged && formData.primary_color && formData.accent_color && formData.sidebar_color) {
      // Debounce auto-save to avoid too many API calls
      const autoSaveTimer = setTimeout(async () => {
        try {
          logger.log('🔄 Auto-saving color changes...');
          await updateSettings({
            primary_color: formData.primary_color,
            accent_color: formData.accent_color,
            sidebar_color: formData.sidebar_color,
          });
          logger.log('✅ Colors auto-saved successfully');
          toast.success('Colors saved automatically', { duration: 2000 });
        } catch (error: any) {
          logger.error('❌ Auto-save failed:', error);
          toast.error('Auto-save failed. Please save manually.', { duration: 3000 });
        }
      }, 1500); // Wait 1.5 seconds after last change
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [formData.primary_color, formData.accent_color, formData.sidebar_color, settings, updateSettings]);

  // Fetch companies for company-specific branding
  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const response = await apiClient.getCompanies();
        logger.log('Loaded companies:', response);
        
        // Handle paginated response
        const companiesData = response.results || response;
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        
        if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
        }
      } catch (error: any) {
        logger.error('Failed to fetch companies:', error);
        toast.error('Failed to load companies');
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    
    fetchCompanies();
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'favicon'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const maxSize = type === 'favicon' ? 512 * 1024 : 2 * 1024 * 1024; // 512KB for favicon, 2MB for logo
    if (file.size > maxSize) {
      toast.error(`Please upload an image under ${type === 'favicon' ? '512KB' : '2MB'}`);
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingFavicon(true);

    try {
      let response;
      if (type === 'logo') {
        response = await apiClient.uploadLogo(file);
      } else {
        response = await apiClient.uploadFavicon(file);
      }
      
      const fieldName = type === 'logo' ? 'logo_url' : 'favicon_url';
      setFormData(prev => ({ ...prev, [fieldName]: response[fieldName] }));
      
      toast.success(response.message);
      
      // Refresh settings to get the updated data
      await refreshSettings();
    } catch (error: any) {
      logger.error(`${type} upload error:`, error);
      
      // Parse error details from API response
      let errorMessage = `Failed to upload ${type}`;
      try {
        const errorData = JSON.parse(error.message.split('details: ')[1]);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingFavicon(false);
    }
  };

  // Handle company logo upload
  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Please upload an image under 2MB');
      return;
    }

    setIsUploadingCompanyLogo(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await apiClient.updateCompany(selectedCompany.id, formData);

      // Update the selected company with new logo
      setSelectedCompany(response);
      
      // Update companies list
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id ? response : c
      ));

      toast.success(`Logo uploaded for ${selectedCompany.name}`);
    } catch (error: any) {
      logger.error('Company logo upload error:', error);
      toast.error('Failed to upload company logo');
    } finally {
      setIsUploadingCompanyLogo(false);
    }
  };



  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Remove preview styles before saving to avoid conflicts
      const previewStyle = document.getElementById('preview-color-overrides');
      if (previewStyle) {
        previewStyle.remove();
      }
      
      // Save all settings to database
      await updateSettings({
        app_name: formData.app_name,
        logo_url: formData.logo_url || null,
        favicon_url: formData.favicon_url || null,
        primary_color: formData.primary_color,
        accent_color: formData.accent_color,
        sidebar_color: formData.sidebar_color,
        custom_css: formData.custom_css || null,
      });
      
      // Force refresh settings to ensure colors are applied
      await refreshSettings();
      
      toast.success('Branding settings saved successfully');
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Branding Settings" subtitle="Customize your application appearance" />
      
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="grid w-full sm:max-w-md grid-cols-2">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global Branding
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Company Branding
            </TabsTrigger>
          </TabsList>

          {/* Global Branding Tab */}
          <TabsContent value="global" className="space-y-6">
            {/* App Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  App Identity
                </CardTitle>
                <CardDescription>Set your global application name and logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Application Name</Label>
                  <Input
                    id="app_name"
                    value={formData.app_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, app_name: e.target.value }))}
                    placeholder="Your App Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {formData.logo_url ? (
                      <img 
                        src={formData.logo_url} 
                        alt="Logo" 
                        className="h-16 w-16 object-contain rounded-lg border shrink-0" 
                        onError={(e) => {
                          logger.error('❌ Logo failed to load:', formData.logo_url);
                          logger.error('Error event:', e);
                        }}
                        onLoad={() => {
                          logger.log('✅ Logo loaded successfully:', formData.logo_url);
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={(e) => handleImageUpload(e, 'logo')}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 200x200px, max 2MB</p>
                      {formData.logo_url && (
                        <p className="text-xs text-blue-600 mt-1 break-all">Current: {formData.logo_url}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Favicon Upload */}
                <div className="space-y-2">
                  <Label>Favicon (Browser Tab Icon)</Label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {formData.favicon_url ? (
                      <img src={formData.favicon_url} alt="Favicon" className="h-12 w-12 object-contain rounded-lg border shrink-0" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <Globe className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={(e) => handleImageUpload(e, 'favicon')}
                        accept="image/png,image/x-icon,image/svg+xml"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={isUploadingFavicon}
                      >
                        {isUploadingFavicon ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Favicon
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 32x32px or 64x64px PNG, max 512KB</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Palette
            </CardTitle>
            <CardDescription>Customize your application colors. Supports HEX, RGB, and HSL formats.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <ColorPickerField
                label="Primary Color"
                value={formData.primary_color}
                onChange={(value) => setFormData(prev => ({ ...prev, primary_color: value }))}
                placeholder="#2563eb or 215 80% 35%"
              />
              <ColorPickerField
                label="Accent Color"
                value={formData.accent_color}
                onChange={(value) => setFormData(prev => ({ ...prev, accent_color: value }))}
                placeholder="#06b6d4 or 190 70% 45%"
              />
              <ColorPickerField
                label="Sidebar Color"
                value={formData.sidebar_color}
                onChange={(value) => setFormData(prev => ({ ...prev, sidebar_color: value }))}
                placeholder="#1e293b or 220 30% 12%"
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom CSS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Custom CSS
            </CardTitle>
            <CardDescription>Add custom CSS styles (advanced users only)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.custom_css}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_css: e.target.value }))}
              placeholder={`/* Custom CSS */\n.my-custom-class {\n  /* styles */\n}`}
              className="font-mono min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Warning: Invalid CSS may break the application appearance. Use with caution.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              // Reset to default colors
              setFormData(prev => ({
                ...prev,
                primary_color: '152 45% 28%',
                accent_color: '45 90% 50%',
                sidebar_color: '152 35% 15%',
              }));
              toast.success('Colors reset to defaults');
            }}
          >
            Reset Colors
          </Button>
          
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Branding Settings'
            )}
          </Button>
        </div>
          </TabsContent>

          {/* Company Branding Tab */}
          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company-Specific Branding
                </CardTitle>
                <CardDescription>
                  Upload logos and set titles for each company. These will be displayed to employees and managers of that company.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingCompanies ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No companies found. Create companies first.</p>
                  </div>
                ) : (
                  <>
                    {/* Company Selector */}
                    <div className="space-y-2">
                      <Label>Select Company</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {companies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => setSelectedCompany(company)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedCompany?.id === company.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {company.logo_url ? (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  className="h-10 w-10 object-contain rounded"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Building className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{company.name}</p>
                                <p className="text-xs text-muted-foreground">{company.code}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Company Branding */}
                    {selectedCompany && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{selectedCompany.name}</h3>
                            <p className="text-sm text-muted-foreground">Code: {selectedCompany.code}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            selectedCompany.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedCompany.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>

                        {/* Company Logo Upload */}
                        <div className="space-y-2">
                          <Label>Company Logo</Label>
                          <div className="flex items-center gap-4">
                            {selectedCompany.logo_url ? (
                              <img
                                src={selectedCompany.logo_url}
                                alt={selectedCompany.name}
                                className="h-20 w-20 object-contain rounded-lg border-2 border-border"
                              />
                            ) : (
                              <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                                <Building className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <input
                                type="file"
                                ref={companyLogoInputRef}
                                onChange={handleCompanyLogoUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <Button
                                variant="outline"
                                onClick={() => companyLogoInputRef.current?.click()}
                                disabled={isUploadingCompanyLogo}
                                className="w-full sm:w-auto"
                              >
                                {isUploadingCompanyLogo ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                {selectedCompany.logo_url ? 'Change Logo' : 'Upload Logo'}
                              </Button>
                              <p className="text-xs text-muted-foreground mt-2">
                                This logo will be displayed to {selectedCompany.name} employees and managers in the sidebar and as favicon.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Recommended: 200x200px, max 2MB
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Company Display Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Employees and managers of {selectedCompany.name} will see this logo in the sidebar</li>
                            <li>• The company name "{selectedCompany.name}" will appear as the app title</li>
                            <li>• The browser tab will show "{selectedCompany.name}" as the page title</li>
                            <li>• The company logo will be used as the favicon (browser tab icon)</li>
                            <li>• Admin and HR users will continue to see the global branding</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminBranding;
