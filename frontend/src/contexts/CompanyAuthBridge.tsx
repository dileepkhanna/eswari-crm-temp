import { useEffect } from 'react';
import { useAuth } from './AuthContextDjango';
import { useCompany } from './CompanyContext';

import { logger } from '@/lib/logger';
/**
 * Bridge component that synchronizes authentication state with company context.
 * This component initializes company context from authentication response.
 */
export const CompanyAuthBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { initializeCompanyContext, clearCompanyContext } = useCompany();

  useEffect(() => {
    if (isAuthenticated && user) {
      // TODO: Once backend provides company data in auth response, initialize here
      // For now, this is a placeholder for future integration
      // Expected data structure from backend:
      // - user.company: { id, name, code } for manager/employee
      // - user.companies: [{ id, name, code }] for admin/hr
      
      // Example initialization (will be replaced with actual backend data):
      // if (user.role === 'admin' || user.role === 'hr') {
      //   initializeCompanyContext(user.role, undefined, user.companies);
      // } else {
      //   initializeCompanyContext(user.role, user.company);
      // }
      
      logger.log('CompanyAuthBridge: User authenticated, waiting for backend company data');
    } else {
      // Clear company context on logout
      clearCompanyContext();
    }
  }, [isAuthenticated, user, initializeCompanyContext, clearCompanyContext]);

  return <>{children}</>;
};
