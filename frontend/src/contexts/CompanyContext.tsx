import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
interface CompanyContextType {
  selectedCompany: Company | null;
  availableCompanies: Company[];
  setSelectedCompany: (company: Company) => void;
  canSelectCompany: boolean;
  initializeCompanyContext: (userRole: string, userCompany?: Company, companies?: Company[]) => void;
  clearCompanyContext: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [canSelectCompany, setCanSelectCompany] = useState(false);
  
  // Load persisted company selection from localStorage on initialization
  useEffect(() => {
    const stored = localStorage.getItem('selectedCompany');
    if (stored) {
      try {
        const company = JSON.parse(stored);
        setSelectedCompanyState(company);
      } catch (error) {
        logger.error('Failed to parse stored company:', error);
        localStorage.removeItem('selectedCompany');
      }
    }
  }, []);
  
  // Set selected company and persist to localStorage
  const setSelectedCompany = useCallback((company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompany', JSON.stringify(company));
  }, []);
  
  // Initialize company context from authentication response
  const initializeCompanyContext = useCallback((
    userRole: string, 
    userCompany?: Company, 
    companies?: Company[]
  ) => {
    // Admin and HR can select companies
    const canSelect = userRole === 'admin' || userRole === 'hr';
    setCanSelectCompany(canSelect);
    
    if (canSelect && companies && companies.length > 0) {
      // Set available companies for admin/hr
      setAvailableCompanies(companies);
      
      // Try to restore persisted selection if it's still valid
      const stored = localStorage.getItem('selectedCompany');
      if (stored) {
        try {
          const persistedCompany = JSON.parse(stored);
          const isValid = companies.some(c => c.id === persistedCompany.id);
          if (isValid) {
            setSelectedCompanyState(persistedCompany);
            return;
          }
        } catch (error) {
          logger.error('Failed to parse stored company:', error);
        }
      }
      
      // Default to first company if no valid persisted selection
      setSelectedCompany(companies[0]);
    } else if (userCompany) {
      // Manager and Employee use their assigned company
      setAvailableCompanies([userCompany]);
      setSelectedCompanyState(userCompany);
      localStorage.setItem('selectedCompany', JSON.stringify(userCompany));
    }
  }, [setSelectedCompany]);
  
  // Clear company context on logout
  const clearCompanyContext = useCallback(() => {
    setSelectedCompanyState(null);
    setAvailableCompanies([]);
    setCanSelectCompany(false);
    localStorage.removeItem('selectedCompany');
  }, []);
  
  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      availableCompanies,
      setSelectedCompany,
      canSelectCompany,
      initializeCompanyContext,
      clearCompanyContext
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};
