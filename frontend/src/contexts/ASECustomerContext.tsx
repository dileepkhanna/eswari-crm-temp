import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { ASECustomer, ASECustomerFormData, ASECustomerStats } from '@/types/ase-customer';
import { ASECustomerService } from '@/services/ase-customer.service';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Single filter+page state — one dispatch = one render = one fetch
// ---------------------------------------------------------------------------
interface FilterState {
  search: string;       // raw input value (shown in the input)
  debouncedSearch: string; // committed to the API after 400 ms
  status: string;
  page: number;
}

type FilterAction =
  | { type: 'SET_SEARCH_COMMIT'; search: string }   // debounce fires: update both + reset page
  | { type: 'SET_STATUS'; status: string }           // filter change: reset page
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_SEARCH_RAW'; search: string };      // immediate: only update the input value

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_SEARCH_RAW':
      return { ...state, search: action.search };
    case 'SET_SEARCH_COMMIT':
      // Batch: commit debounced value AND reset page in one update
      return { ...state, search: action.search, debouncedSearch: action.search, page: 1 };
    case 'SET_STATUS':
      return { ...state, status: action.status, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    default:
      return state;
  }
}
interface ASECustomerContextType {
  customers: ASECustomer[];
  stats: ASECustomerStats | null;
  loading: boolean;
  error: string | null;

  // Pagination & filters
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalCount: number;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  
  // CRUD operations
  fetchCustomers: () => Promise<void>;
  createCustomer: (data: Partial<ASECustomerFormData>) => Promise<ASECustomer>;
  updateCustomer: (id: string, data: Partial<ASECustomerFormData>) => Promise<ASECustomer>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Stats and special queries
  fetchStats: () => Promise<void>;
  getFollowUps: () => Promise<ASECustomer[]>;
  getHighPriority: () => Promise<ASECustomer[]>;
  
  // Activities
  addActivity: (customerId: string, activity: any) => Promise<void>;
  
  // Conversion
  convertToLead: (customerId: string, leadData: any) => Promise<void>;
  
  // Import/Export
  importCustomers: (file: File) => Promise<any>;
  exportCustomers: () => Promise<Blob>;
  downloadTemplate: () => Promise<Blob>;
  
  // Reassignment
  reassignCustomer: (customerId: string, assignedTo: string, reason?: string) => Promise<void>;
  bulkAssignCustomers: (customerIds: string[], assignedTo: string) => Promise<void>;
  bulkDeleteCustomers: (customerIds: string[]) => Promise<void>;

  // Overdue badge
  overdueCount: number;
  refreshOverdueCount: () => Promise<void>;
}

const ASECustomerContext = createContext<ASECustomerContextType | undefined>(undefined);

export function useASECustomers() {
  const context = useContext(ASECustomerContext);
  if (!context) {
    throw new Error('useASECustomers must be used within an ASECustomerProvider');
  }
  return context;
}

interface ASECustomerProviderProps {
  children: React.ReactNode;
}

export function ASECustomerProvider({ children }: ASECustomerProviderProps) {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<ASECustomer[]>([]);
  const [stats, setStats] = useState<ASECustomerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overdueCount, setOverdueCount] = useState(0);

  // Single reducer owns search + status + page — one dispatch = one render = one fetch
  const [filters, dispatch] = useReducer(filterReducer, {
    search: '',
    debouncedSearch: '',
    status: 'all',
    page: 1,
  });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable setters matching the existing context API surface
  const setSearchTerm = useCallback((v: string) => {
    dispatch({ type: 'SET_SEARCH_RAW', search: v });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    // Single dispatch after 400 ms: commits debounced value AND resets page atomically
    searchTimer.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH_COMMIT', search: v });
    }, 400);
  }, []);

  const setStatusFilter = useCallback((v: string) => {
    dispatch({ type: 'SET_STATUS', status: v });
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  // Convenience aliases used throughout the rest of the provider
  const currentPage = filters.page;
  const statusFilter = filters.status;
  const searchTerm = filters.search;
  const debouncedSearch = filters.debouncedSearch;

  // Fetch customers with pagination + filters
  const fetchCustomers = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const companyId = selectedCompany?.id || (user.role !== 'admin' ? user?.company?.id : undefined);
      const data = await ASECustomerService.getCustomers({
        page: currentPage,
        page_size: 50,
        search: debouncedSearch || undefined,
        call_status: statusFilter !== 'all' ? statusFilter : undefined,
        company: companyId || undefined,
      });
      setCustomers(data.results);
      setTotalCount(data.count);
      setTotalPages(Math.ceil(data.count / 50) || 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch customers';
      setError(errorMessage);
      logger.error('Error fetching ASE customers:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCompany, currentPage, debouncedSearch, statusFilter]);

  // Create customer
  const createCustomer = useCallback(async (data: Partial<ASECustomerFormData>): Promise<ASECustomer> => {
    try {
      setError(null);
      const companyId = selectedCompany?.id || user?.company?.id;
      if (!companyId) throw new Error('Company information is required');
      
      const newCustomer = await ASECustomerService.createCustomer({ ...data, company: companyId } as any);
      setCustomers(prev => [newCustomer, ...prev]);
      toast.success('ASE Customer created successfully');
      return newCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create customer';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [user, selectedCompany]);

  // Update customer
  const updateCustomer = useCallback(async (id: string, data: Partial<ASECustomerFormData>): Promise<ASECustomer> => {
    try {
      setError(null);
      const updatedCustomer = await ASECustomerService.updateCustomer(id, data);
      setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
      toast.success('ASE Customer updated successfully');
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update customer';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Delete customer
  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await ASECustomerService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success('ASE Customer deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete customer';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const statsData = await ASECustomerService.getStats();
      setStats(statsData);
    } catch (err) {
      logger.error('Error fetching ASE customer stats:', err);
    }
  }, [user]);

  // Get follow-ups
  const getFollowUps = useCallback(async (): Promise<ASECustomer[]> => {
    try {
      const res = await ASECustomerService.getFollowUps();
      return res.results;
    } catch (err) {
      logger.error('Error fetching follow-ups:', err);
      return [];
    }
  }, []);

  // Refresh overdue count
  const refreshOverdueCount = useCallback(async () => {
    try {
      const count = await ASECustomerService.getOverdueCount();
      setOverdueCount(count);
    } catch (err) {
      logger.error('Error fetching overdue count:', err);
    }
  }, []);

  // Get high priority customers
  const getHighPriority = useCallback(async (): Promise<ASECustomer[]> => {
    try {
      return await ASECustomerService.getHighPriority();
    } catch (err) {
      logger.error('Error fetching high priority customers:', err);
      return [];
    }
  }, []);

  // Add activity
  const addActivity = useCallback(async (customerId: string, activity: any): Promise<void> => {
    try {
      await ASECustomerService.addActivity(customerId, activity);
      
      // Refresh the specific customer or all customers
      await fetchCustomers();
      
      toast.success('Activity added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activity';
      toast.error(errorMessage);
      throw err;
    }
  }, [fetchCustomers]);

  // Convert customer to lead
  const convertToLead = useCallback(async (customerId: string, leadData: any): Promise<void> => {
    try {
      setError(null);
      const result = await ASECustomerService.convertToLead(customerId, leadData);
      
      // Update the customer as converted in local state
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, is_converted: true, converted_lead_id: result.lead_id }
            : customer
        )
      );
      
      // Refresh stats
      fetchStats();
      
      toast.success(`Customer converted to lead successfully! Lead ID: ${result.lead_id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert customer to lead';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [fetchStats]);

  // Import customers
  const importCustomers = useCallback(async (file: File): Promise<any> => {
    try {
      setError(null);
      const result = await ASECustomerService.importCustomers(file);
      
      // Refresh customers list
      await fetchCustomers();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import customers';
      setError(errorMessage);
      throw err;
    }
  }, [fetchCustomers]);

  // Export customers
  const exportCustomers = useCallback(async (): Promise<Blob> => {
    try {
      setError(null);
      return await ASECustomerService.exportCustomers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export customers';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Download template
  const downloadTemplate = useCallback(async (): Promise<Blob> => {
    try {
      setError(null);
      return await ASECustomerService.downloadTemplate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Bulk assign customers
  const bulkAssignCustomers = useCallback(async (customerIds: string[], assignedTo: string): Promise<void> => {
    try {
      setError(null);
      const result = await ASECustomerService.bulkAssign(customerIds, assignedTo);
      // Refresh list to get updated assigned_to_name
      await fetchCustomers();
      toast.success(`${result.updated} customer${result.updated !== 1 ? 's' : ''} assigned to ${result.assigned_to}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk assign customers';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [fetchCustomers]);

  // Bulk delete customers
  const bulkDeleteCustomers = useCallback(async (customerIds: string[]): Promise<void> => {
    try {
      setError(null);
      const result = await ASECustomerService.bulkDelete(customerIds);
      setCustomers(prev => prev.filter(c => !customerIds.includes(c.id)));
      toast.success(`${result.deleted} customer${result.deleted !== 1 ? 's' : ''} deleted successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete customers';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Reassign customer
  const reassignCustomer = useCallback(async (customerId: string, assignedTo: string, reason?: string): Promise<void> => {
    try {
      setError(null);
      const result = await ASECustomerService.reassignCustomer(customerId, assignedTo, reason);
      
      // Update local state
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, assigned_to: assignedTo || undefined, assigned_to_name: result.new_assignee || undefined }
            : customer
        )
      );
      
      toast.success(result.message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reassign customer';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchStats();
      refreshOverdueCount();
    }
  }, [user, fetchCustomers, fetchStats, refreshOverdueCount]);

  const value: ASECustomerContextType = {
    customers,
    stats,
    loading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchStats,
    getFollowUps,
    getHighPriority,
    addActivity,
    convertToLead,
    importCustomers,
    exportCustomers,
    downloadTemplate,
    reassignCustomer,
    bulkAssignCustomers,
    bulkDeleteCustomers,
    overdueCount,
    refreshOverdueCount,
  };

  return (
    <ASECustomerContext.Provider value={value}>
      {children}
    </ASECustomerContext.Provider>
  );
}