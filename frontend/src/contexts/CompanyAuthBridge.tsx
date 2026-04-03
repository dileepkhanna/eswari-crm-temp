import { useEffect } from 'react';
import { useAuth } from './AuthContextDjango';
import { useCompany } from './CompanyContext';
import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Bridge component that synchronizes authentication state with company context.
 * Sits inside both AuthProvider and CompanyProvider so it can access both.
 */
export const CompanyAuthBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { initializeCompanyContext, clearCompanyContext, availableCompanies } = useCompany();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearCompanyContext();
      return;
    }

    // Already initialized — don't re-fetch
    if (availableCompanies.length > 0) return;

    const init = async () => {
      const userCompany = user.company as any;
      let companies = (user as any).available_companies || [];

      // Admin/HR: fetch full companies list from API
      if (user.role === 'admin' || user.role === 'hr') {
        try {
          const res = await apiClient.getCompanies() as any;
          companies = Array.isArray(res) ? res : res.results || [];
        } catch (e) {
          logger.error('CompanyAuthBridge: failed to fetch companies', e);
        }
      }

      initializeCompanyContext(user.role, userCompany, companies);
    };

    init();
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
};
