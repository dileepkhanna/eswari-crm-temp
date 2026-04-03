import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ASELead, ASELeadFormData } from '@/types/ase-customer';
import { aseLeadService, ASELeadStats } from '@/services/ase-lead.service';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';

import { logger } from '@/lib/logger';
interface ASELeadContextType {
  // State
  leads: ASELead[];
  stats: ASELeadStats | null;
  loading: boolean;
  error: string | null;
  creators: { id: number; name: string }[];
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  
  // Filters
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  industryFilter: string;
  budgetRangeFilter: string;
  createdByFilter: string;
  
  // Actions
  fetchLeads: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createLead: (leadData: ASELeadFormData) => Promise<ASELead | null>;
  updateLead: (id: string, leadData: Partial<ASELeadFormData>) => Promise<ASELead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  
  // Filter actions
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setPriorityFilter: (priority: string) => void;
  setIndustryFilter: (industry: string) => void;
  setBudgetRangeFilter: (budgetRange: string) => void;
  setCreatedByFilter: (createdBy: string) => void;
  setCurrentPage: (page: number) => void;
  
  // Utility actions
  refreshData: () => Promise<void>;
  clearFilters: () => void;
}

const ASELeadContext = createContext<ASELeadContextType | undefined>(undefined);

interface ASELeadProviderProps {
  children: ReactNode;
}

export function ASELeadProvider({ children }: ASELeadProviderProps) {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [leads, setLeads] = useState<ASELead[]>([]);
  const [stats, setStats] = useState<ASELeadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creators, setCreators] = useState<{ id: number; name: string }[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [budgetRangeFilter, setBudgetRangeFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');

  // Debounced search — only fire API after 400ms of no typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetSearchTerm = (term: string) => {
    setSearchTerm(term);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(term), 400);
  };
  
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const PAGE_SIZE = 50;
      const companyId = selectedCompany?.id || ((user?.company as any)?.id);
      const params: any = {
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        industry: industryFilter || undefined,
        created_by: createdByFilter || undefined,
        page: currentPage,
        page_size: PAGE_SIZE,
      };
      // Pass company so admin sees the correct company's leads
      if (companyId) {
        params.company = companyId;
      }
      
      const response = await aseLeadService.getLeads(params);

      // Handle both paginated { results, count } and plain array responses
      if (response && Array.isArray(response.results)) {
        setLeads(response.results);
        setTotalCount(response.count ?? response.results.length);
        setTotalPages(Math.ceil((response.count ?? response.results.length) / PAGE_SIZE));
      } else if (Array.isArray(response)) {
        setLeads(response);
        setTotalCount(response.length);
        setTotalPages(Math.ceil(response.length / PAGE_SIZE));
      } else {
        setLeads([]);
        setTotalCount(0);
        setTotalPages(1);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads';
      // If invalid page (404), reset to page 1 and retry
      if (errorMessage.includes('Invalid page') || errorMessage.includes('404')) {
        if (currentPage !== 1) {
          setCurrentPage(1);
          return; // the currentPage useEffect will re-fetch at page 1
        }
      }
      setError(errorMessage);
      logger.error('❌ ASE Leads: Failed to fetch leads:', err);
      toast.error('Error loading leads');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const companyId = selectedCompany?.id || ((user?.company as any)?.id);
      const statsData = await aseLeadService.getStats(companyId ? String(companyId) : undefined);
      setStats(statsData);
    } catch (err) {
      logger.error('❌ ASE Leads: Failed to fetch stats:', err);
    }
  };
  
  const fetchCreators = async () => {
    try {
      const companyId = selectedCompany?.id || ((user?.company as any)?.id);
      const data = await aseLeadService.getCreators(companyId);
      setCreators(data);
    } catch (err) {
      logger.error('❌ ASE Leads: Failed to fetch creators:', err);
    }
  };

  const createLead = async (leadData: ASELeadFormData): Promise<ASELead | null> => {
    try {
      setLoading(true);
      // user.company in auth context is a Company object with .id
      const companyId = selectedCompany?.id || (user?.company as any)?.id;
      if (!companyId) {
        toast.error('No company selected');
        return null;
      }
      const payload: any = { ...leadData };
      if (!payload.company) {
        payload.company = companyId;
      }
      const newLead = await aseLeadService.createLead(payload);
      // Optimistic: prepend to local state immediately
      setLeads(prev => [newLead, ...prev]);
      setTotalCount(prev => prev + 1);
      toast.success('Lead created successfully');
      if (user) logActivity({
        userId: String(user.id), userName: user.name, userRole: user.role,
        companyId: Number(companyId),
        module: 'leads', action: 'created',
        details: `created lead: ${newLead.contact_person || newLead.phone}`,
      });
      return newLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lead';
      logger.error('❌ ASE Leads: Failed to create lead:', err);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (id: string, leadData: Partial<ASELeadFormData>): Promise<ASELead | null> => {
    try {
      setLoading(true);
      const updatedLead = await aseLeadService.updateLead(id, leadData);
      // Optimistic: replace in local state immediately
      setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
      toast.success('Lead updated successfully');
      if (user) logActivity({
        userId: String(user.id), userName: user.name, userRole: user.role,
        companyId: Number(selectedCompany?.id || (user?.company as any)?.id || 0),
        module: 'leads', action: 'updated',
        details: `updated lead: ${updatedLead.contact_person || updatedLead.phone}`,
      });
      return updatedLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      logger.error('❌ ASE Leads: Failed to update lead:', err);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const lead = leads.find(l => l.id === id);
      await aseLeadService.deleteLead(id);
      // Optimistic: remove from local state immediately
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      toast.success('Lead deleted successfully');
      if (user) logActivity({
        userId: String(user.id), userName: user.name, userRole: user.role,
        companyId: Number(selectedCompany?.id || (user?.company as any)?.id || 0),
        module: 'leads', action: 'deleted',
        details: `deleted lead: ${lead?.contact_person || lead?.phone || id}`,
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete lead';
      logger.error('❌ ASE Leads: Failed to delete lead:', err);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const refreshData = async () => {
    await Promise.all([fetchLeads(), fetchStats(), fetchCreators()]);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setIndustryFilter('');
    setBudgetRangeFilter('');
    setCreatedByFilter('');
    setCurrentPage(1);
  };
  
  // Reset page to 1 when filters or company change, then fetch
  useEffect(() => {
    if (currentPage === 1) {
      fetchLeads(); // already on page 1, fetch directly
    } else {
      setCurrentPage(1); // this triggers the currentPage useEffect below
    }
  }, [debouncedSearch, statusFilter, priorityFilter, industryFilter, budgetRangeFilter, createdByFilter, selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when page changes (pagination clicks or reset to 1)
  useEffect(() => {
    fetchLeads();
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Initial stats fetch + re-fetch on company change
  useEffect(() => {
    fetchStats();
    fetchCreators();
  }, [selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const value: ASELeadContextType = {
    // State
    leads,
    stats,
    loading,
    error,
    creators,
    
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    
    // Filters
    searchTerm,
    statusFilter,
    priorityFilter,
    industryFilter,
    budgetRangeFilter,
    createdByFilter,
    
    // Actions
    fetchLeads,
    fetchStats,
    createLead,
    updateLead,
    deleteLead,
    
    // Filter actions
    setSearchTerm: handleSetSearchTerm,
    setStatusFilter,
    setPriorityFilter,
    setIndustryFilter,
    setBudgetRangeFilter,
    setCreatedByFilter,
    setCurrentPage,
    
    // Utility actions
    refreshData,
    clearFilters,
  };
  
  return (
    <ASELeadContext.Provider value={value}>
      {children}
    </ASELeadContext.Provider>
  );
}

export function useASELead() {
  const context = useContext(ASELeadContext);
  if (context === undefined) {
    throw new Error('useASELead must be used within an ASELeadProvider');
  }
  return context;
}
