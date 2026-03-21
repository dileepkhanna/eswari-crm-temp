import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';

/**
 * CompanyBranding component
 * Dynamically updates page title and favicon based on user's company
 * 
 * For employees/managers: Shows company-specific branding
 * For admin/hr: Shows global app branding
 */
export const CompanyBranding = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { settings } = useAppSettings();

  useEffect(() => {
    if (!user) return;

    // Determine if user should see company-specific branding
    const isCompanyUser = user.role !== 'admin' && user.role !== 'hr';
    
    // Get the appropriate title
    let pageTitle = 'CRM';
    if (isCompanyUser) {
      // Employee/Manager: Use company name
      pageTitle = selectedCompany?.name || user.company?.name || 'CRM';
    } else {
      // Admin/HR: Use global app name
      pageTitle = settings?.app_name || 'Eswari CRM';
    }

    // Update page title
    document.title = pageTitle;

    // Update favicon if company has a logo
    const faviconUrl = isCompanyUser 
      ? (selectedCompany?.logo_url || user.company?.logo_url)
      : settings?.logo_url;

    if (faviconUrl) {
      updateFavicon(faviconUrl);
    }

  }, [user, selectedCompany, settings]);

  return null; // This component doesn't render anything
};

/**
 * Update the favicon dynamically
 */
function updateFavicon(iconUrl: string) {
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(link => link.remove());

  // Add new favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = iconUrl;
  document.head.appendChild(link);

  // Also add apple-touch-icon for mobile devices
  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = iconUrl;
  document.head.appendChild(appleLink);
}
