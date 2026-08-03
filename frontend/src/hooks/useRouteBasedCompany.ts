/**
 * Hook to automatically select company based on current route
 * Used for multi-company admin navigation
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContextDjango';

/**
 * Route to Company mapping
 * Define which routes belong to which company
 */
const ROUTE_COMPANY_MAP: Record<string, number> = {
  // Eswari Group routes (Company ID: 1)
  '/admin/customers': 1,
  '/admin/leads': 1,
  '/admin/tasks': 1,
  '/admin/projects': 1,
  '/admin/eswari-employees': 1,
  '/admin/reports': 1,
  '/admin/activity': 1,
  '/customers': 1,
  '/leads': 1,
  '/tasks': 1,
  '/projects': 1,
  '/eswari-employees': 1,
  '/reports': 1,
  '/activity': 1,
  
  // ASE Technologies routes (Company ID: 2)
  '/admin/ase-customers': 2,
  '/admin/ase-leads': 2,
  '/admin/ase-tasks': 2,
  '/admin/ase-employees': 2,
  '/admin/ase-reports': 2,
  '/admin/ase-activity': 2,
  '/ase-customers': 2,
  '/ase-leads': 2,
  '/ase-tasks': 2,
  '/ase-employees': 2,
  '/ase-reports': 2,
  '/ase-activity': 2,
  
  // Eswari Capital routes (Company ID: 3)
  '/admin/capital-customers': 3,
  '/admin/capital-dashboard': 3,
  '/admin/capital-employees': 3,
  '/capital-customers': 3,
  '/capital-dashboard': 3,
  '/capital-employees': 3,
};

export function useRouteBasedCompany() {
  const location = useLocation();
  const { user } = useAuth();
  const { selectedCompany, availableCompanies, setSelectedCompany, canSelectCompany } = useCompany();
  
  useEffect(() => {
    console.log('🔍 Route-based company hook running');
    console.log('🔍 Can select company:', canSelectCompany);
    console.log('🔍 User:', user?.email);
    console.log('🔍 Available companies:', availableCompanies);
    console.log('🔍 Current pathname:', location.pathname);
    console.log('🔍 Current selected company:', selectedCompany);
    
    // Only auto-select for users who can select companies (admin/hr)
    if (!canSelectCompany || !user || availableCompanies.length === 0) {
      console.log('⚠️ Route-based company selection skipped:', {
        canSelectCompany,
        hasUser: !!user,
        companiesCount: availableCompanies.length
      });
      return;
    }
    
    // Find which company this route belongs to
    const pathname = location.pathname;
    let targetCompanyId: number | null = null;
    
    // Check each route pattern
    for (const [route, companyId] of Object.entries(ROUTE_COMPANY_MAP)) {
      if (pathname.startsWith(route)) {
        targetCompanyId = companyId;
        console.log(`✅ Route match found: ${route} → Company ID ${companyId}`);
        break;
      }
    }
    
    if (!targetCompanyId) {
      console.log('⚠️ No company mapping found for route:', pathname);
      return;
    }
    
    // If we found a company for this route and it's different from current selection
    if (targetCompanyId && selectedCompany?.id !== targetCompanyId) {
      const targetCompany = availableCompanies.find(c => c.id === targetCompanyId);
      if (targetCompany) {
        console.log(`🔄 Route-based company switch: ${selectedCompany?.name || 'none'} → ${targetCompany.name}`);
        setSelectedCompany(targetCompany);
      } else {
        console.log(`⚠️ Target company ID ${targetCompanyId} not found in available companies`);
      }
    } else {
      console.log(`ℹ️ Already on correct company (${selectedCompany?.name})`);
    }
  }, [location.pathname, canSelectCompany, selectedCompany, availableCompanies, setSelectedCompany, user]);
}
