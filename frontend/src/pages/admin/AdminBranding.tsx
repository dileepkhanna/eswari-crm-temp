import React, { useState, useRef, useEffect } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// import { supabase } from '@/integrations/supabase/client'; // Removed - using Django backend
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Code, Building2, Loader2, Globe } from 'lucide-react';

const AdminBranding = () => {
  const { settings, updateSettings, isLoading } = useAppSettings();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const [formData, setFormData] = useState({
    app_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '',
    accent_color: '',
    sidebar_color: '',
    custom_css: '',
  });

  useEffect(() => {
    if (settings) {
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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'favicon'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    const maxSize = type === 'favicon' ? 512 * 1024 : 2 * 1024 * 1024; // 512KB for favicon, 2MB for logo
    if (file.size > maxSize) {
      toast({ 
        title: 'File too large', 
        description: `Please upload an image under ${type === 'favicon' ? '512KB' : '2MB'}`, 
        variant: 'destructive' 
      });
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingFavicon(true);

    try {
      // TODO: Implement file upload API in Django backend
      // const fileExt = file.name.split('.').pop();
      // const fileName = `${type}-${Date.now()}.${fileExt}`;

      // const { error: uploadError } = await supabase.storage
      //   .from('project-images')
      //   .upload(fileName, file, { upsert: true });

      // if (uploadError) throw uploadError;

      // const { data: urlData } = supabase.storage
      //   .from('project-images')
      //   .getPublicUrl(fileName);

      // const fieldName = type === 'logo' ? 'logo_url' : 'favicon_url';
      // setFormData(prev => ({ ...prev, [fieldName]: urlData.publicUrl }));
      toast({ title: `${type === 'logo' ? 'Logo' : 'Favicon'} upload not implemented yet` });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingFavicon(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        app_name: formData.app_name,
        logo_url: formData.logo_url || null,
        favicon_url: formData.favicon_url || null,
        primary_color: formData.primary_color,
        accent_color: formData.accent_color,
        sidebar_color: formData.sidebar_color,
        custom_css: formData.custom_css || null,
      });
      toast({ title: 'Branding settings saved successfully' });
    } catch (error: any) {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const hslToHex = (hsl: string): string => {
    const parts = hsl.split(' ').map(p => parseFloat(p));
    if (parts.length < 3) return '#3b82f6';
    const [h, s, l] = parts;
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lNorm - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '215 80% 35%';
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
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
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* App Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              App Identity
            </CardTitle>
            <CardDescription>Set your application name and logo</CardDescription>
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
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                ) : (
                  <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
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
                </div>
              </div>
            </div>
            
            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>Favicon (Browser Tab Icon)</Label>
              <div className="flex items-center gap-4">
                {formData.favicon_url ? (
                  <img src={formData.favicon_url} alt="Favicon" className="h-12 w-12 object-contain rounded-lg border" />
                ) : (
                  <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
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
            <CardDescription>Customize your application colors (HSL format)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={hslToHex(formData.primary_color)}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: hexToHsl(e.target.value) }))}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    placeholder="215 80% 35%"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={hslToHex(formData.accent_color)}
                    onChange={(e) => setFormData(prev => ({ ...prev, accent_color: hexToHsl(e.target.value) }))}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input
                    id="accent_color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                    placeholder="38 95% 55%"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sidebar_color">Sidebar Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={hslToHex(formData.sidebar_color)}
                    onChange={(e) => setFormData(prev => ({ ...prev, sidebar_color: hexToHsl(e.target.value) }))}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input
                    id="sidebar_color"
                    value={formData.sidebar_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, sidebar_color: e.target.value }))}
                    placeholder="220 30% 12%"
                  />
                </div>
              </div>
            </div>
            
            {/* Color Preview */}
            <div className="mt-4 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>
              <div className="flex gap-4">
                <div 
                  className="h-12 w-24 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                >
                  Primary
                </div>
                <div 
                  className="h-12 w-24 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: `hsl(${formData.accent_color})` }}
                >
                  Accent
                </div>
                <div 
                  className="h-12 w-24 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: `hsl(${formData.sidebar_color})` }}
                >
                  Sidebar
                </div>
              </div>
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
        <div className="flex justify-end">
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
      </div>
    </div>
  );
};

export default AdminBranding;
