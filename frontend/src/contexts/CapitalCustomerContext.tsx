import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { capitalCustomerService, capitalTaskService, capitalServiceService, capitalLoanService, CapitalCustomer, CapitalTask, CapitalService, CapitalLoan } from '@/services/capital.service';import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Employee { id: string; name: string; role: string; }

interface CapitalContextType {
  customers: CapitalCustomer[];
  tasks: CapitalTask[];
  loans: CapitalLoan[];
  services: CapitalService[];
  employees: Employee[];
  currentUserId: string;
  currentUserRole: string;
  loadingCustomers: boolean;
  loadingTasks: boolean;
  loadingLoans: boolean;
  loadingServices: boolean;
  // Pagination
  servicesPage: number;
  servicesTotalPages: number;
  servicesTotalCount: number;
  loansPage: number;
  loansTotalPages: number;
  loansTotalCount: number;
  customersPage: number;
  customersTotalPages: number;
  customersTotalCount: number;
  loadServicesPage: (page: number) => Promise<void>;
  loadLoansPage: (page: number) => Promise<void>;
  loadCustomersPage: (page: number) => Promise<void>;
  filterServices: (filters: any) => Promise<void>;
  searchServices: (searchTerm: string) => Promise<void>;
  filterLoans: (filters: any) => Promise<void>;
  searchLoans: (searchTerm: string) => Promise<void>;
  filterCustomers: (filters: any) => Promise<void>;
  searchCustomers: (searchTerm: string) => Promise<void>;
  // customers
  addCustomer: (data: Partial<CapitalCustomer>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<CapitalCustomer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  bulkImportCustomers: (rows: any[]) => Promise<void>;
  convertToLead: (id: string) => Promise<void>;
  markCustomerConverted: (id: string) => void;
  refreshCustomers: () => Promise<void>;
  // tasks
  addTask: (data: Partial<CapitalTask>) => Promise<void>;
  updateTask: (id: string, data: Partial<CapitalTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkImportTasks: (rows: any[]) => Promise<void>;
  refreshTasks: () => Promise<void>;
  // loans
  addLoan: (data: Partial<CapitalLoan>) => Promise<void>;
  updateLoan: (id: string, data: Partial<CapitalLoan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  bulkImportLoans: (rows: any[]) => Promise<void>;
  refreshLoans: () => Promise<void>;
  // services
  addService: (data: Partial<CapitalService>) => Promise<void>;
  updateService: (id: string, data: Partial<CapitalService>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  bulkImportServices: (rows: any[]) => Promise<void>;
  refreshServices: () => Promise<void>;
}

const CapitalContext = createContext<CapitalContextType | undefined>(undefined);

export function useCapital() {
  const ctx = useContext(CapitalContext);
  if (!ctx) throw new Error('useCapital must be used within CapitalProvider');
  return ctx;
}

export function CapitalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CapitalCustomer[]>([]);
  const [tasks, setTasks] = useState<CapitalTask[]>([]);
  const [loans, setLoans] = useState<CapitalLoan[]>([]);
  const [services, setServices] = useState<CapitalService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Pagination state
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesTotalPages, setServicesTotalPages] = useState(1);
  const [servicesTotalCount, setServicesTotalCount] = useState(0);
  const [loansPage, setLoansPage] = useState(1);
  const [loansTotalPages, setLoansTotalPages] = useState(1);
  const [loansTotalCount, setLoansTotalCount] = useState(0);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [customersTotalCount, setCustomersTotalCount] = useState(0);
  
  // Filter and search state
  const [servicesFilters, setServicesFilters] = useState<any>({});
  const [servicesSearch, setServicesSearch] = useState('');
  const [loansFilters, setLoansFilters] = useState<any>({});
  const [loansSearch, setLoansSearch] = useState('');
  const [customersFilters, setCustomersFilters] = useState<any>({});
  const [customersSearch, setCustomersSearch] = useState('');

  const fetchEmployees = async () => {
    if (!user) return;
    try {
      const res = await (apiClient as any).request('/capital/company-info/') as any;
      const data = Array.isArray(res?.employees) ? res.employees : [];
      setCurrentUserId(res?.current_user_id?.toString() || user?.id || '');
      setCurrentUserRole(res?.current_user_role || user?.role || '');
      // If no capital-specific employees, fall back to all users
      if (data.length === 0) {
        const allUsers = await apiClient.getUsers() as any;
        const users = Array.isArray(allUsers) ? allUsers : allUsers?.results || [];
        setEmployees(users
          .filter((u: any) => ['employee', 'manager', 'admin'].includes(u.role))
          .map((u: any) => ({
            id: u.id.toString(),
            name: `${u.first_name} ${u.last_name}`.trim() || u.username,
            role: u.role,
          })));
      } else {
        setEmployees(data.map((u: any) => ({
          id: u.id.toString(),
          name: u.name,
          role: u.role,
        })));
      }
    } catch (e) {
      logger.error('Capital: fetchEmployees', e);
      // Fallback to all users on error
      try {
        const allUsers = await apiClient.getUsers() as any;
        const users = Array.isArray(allUsers) ? allUsers : allUsers?.results || [];
        setEmployees(users
          .filter((u: any) => ['employee', 'manager', 'admin'].includes(u.role))
          .map((u: any) => ({
            id: u.id.toString(),
            name: `${u.first_name} ${u.last_name}`.trim() || u.username,
            role: u.role,
          })));
      } catch { /* ignore */ }
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;
    setLoadingCustomers(true);
    try {
      // Build query params with filters and search
      const params: any = { page: 1, page_size: 100 };
      
      if (customersSearch) params.search = customersSearch;
      if (customersFilters.call_status) params.call_status = customersFilters.call_status;
      if (customersFilters.interest) params.interest = customersFilters.interest;
      if (customersFilters.assigned_to) params.assigned_to = customersFilters.assigned_to;
      if (customersFilters.is_converted !== undefined) params.is_converted = customersFilters.is_converted;
      
      const res = await capitalCustomerService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setCustomers(data);
      setCustomersPage(1);
      setCustomersTotalCount(res.count || data.length);
      setCustomersTotalPages(Math.ceil((res.count || data.length) / 100));
      
      // Cache first page
      localStorage.setItem('capital_customers', JSON.stringify(data));
    } catch (e) { logger.error('Capital: fetchCustomers', e); }
    finally { setLoadingCustomers(false); }
  };
  
  const loadCustomersPage = async (page: number) => {
    if (!user) return;
    setLoadingCustomers(true);
    try {
      const params: any = { page, page_size: 100 };
      
      if (customersSearch) params.search = customersSearch;
      if (customersFilters.call_status) params.call_status = customersFilters.call_status;
      if (customersFilters.interest) params.interest = customersFilters.interest;
      if (customersFilters.assigned_to) params.assigned_to = customersFilters.assigned_to;
      if (customersFilters.is_converted !== undefined) params.is_converted = customersFilters.is_converted;
      
      const res = await capitalCustomerService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setCustomers(data);
      setCustomersPage(page);
      setCustomersTotalCount(res.count || data.length);
      setCustomersTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: loadCustomersPage', e); }
    finally { setLoadingCustomers(false); }
  };
  
  const filterCustomers = async (filters: any) => {
    setCustomersFilters(filters);
    setCustomersPage(1);
    if (!user) return;
    setLoadingCustomers(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (customersSearch) params.search = customersSearch;
      if (filters.call_status) params.call_status = filters.call_status;
      if (filters.interest) params.interest = filters.interest;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      if (filters.is_converted !== undefined) params.is_converted = filters.is_converted;
      
      const res = await capitalCustomerService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setCustomers(data);
      setCustomersPage(1);
      setCustomersTotalCount(res.count || data.length);
      setCustomersTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: filterCustomers', e); }
    finally { setLoadingCustomers(false); }
  };
  
  const searchCustomers = async (searchTerm: string) => {
    setCustomersSearch(searchTerm);
    setCustomersPage(1);
    if (!user) return;
    setLoadingCustomers(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (searchTerm) params.search = searchTerm;
      if (customersFilters.call_status) params.call_status = customersFilters.call_status;
      if (customersFilters.interest) params.interest = customersFilters.interest;
      if (customersFilters.assigned_to) params.assigned_to = customersFilters.assigned_to;
      if (customersFilters.is_converted !== undefined) params.is_converted = customersFilters.is_converted;
      
      const res = await capitalCustomerService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setCustomers(data);
      setCustomersPage(1);
      setCustomersTotalCount(res.count || data.length);
      setCustomersTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: searchCustomers', e); }
    finally { setLoadingCustomers(false); }
  };

  const fetchTasks = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const res = await capitalTaskService.list({ page: 1, page_size: 100 }) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setTasks(data);
      // Cache for instant loading next time
      localStorage.setItem('capital_tasks', JSON.stringify(data));
    } catch (e) { logger.error('Capital: fetchTasks', e); }
    finally { setLoadingTasks(false); }
  };

  const fetchServices = async () => {
    if (!user) return;
    setLoadingServices(true);
    try {
      // Build query params with filters and search
      const params: any = { page: 1, page_size: 100 };
      
      // Add search if exists
      if (servicesSearch) {
        params.search = servicesSearch;
      }
      
      // Add filters if exist
      if (servicesFilters.status) {
        params.status = servicesFilters.status;
      }
      if (servicesFilters.service_type) {
        params.service_type = servicesFilters.service_type;
      }
      if (servicesFilters.assigned_to) {
        params.assigned_to = servicesFilters.assigned_to;
      }
      
      const res = await capitalServiceService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setServices(data);
      setServicesPage(1);
      setServicesTotalCount(res.count || data.length);
      setServicesTotalPages(Math.ceil((res.count || data.length) / 100));
      
      // Cache first page
      localStorage.setItem('capital_services', JSON.stringify(data));
      localStorage.setItem('capital_services_count', res.count?.toString() || '0');
    } catch (e) { logger.error('Capital: fetchServices', e); }
    finally { setLoadingServices(false); }
  };
  
  const loadServicesPage = async (page: number) => {
    if (!user) return;
    setLoadingServices(true);
    try {
      // Build query params with filters and search
      const params: any = { page, page_size: 100 };
      
      // Add search if exists
      if (servicesSearch) {
        params.search = servicesSearch;
      }
      
      // Add filters if exist
      if (servicesFilters.status) {
        params.status = servicesFilters.status;
      }
      if (servicesFilters.service_type) {
        params.service_type = servicesFilters.service_type;
      }
      if (servicesFilters.assigned_to) {
        params.assigned_to = servicesFilters.assigned_to;
      }
      
      const res = await capitalServiceService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setServices(data);
      setServicesPage(page);
      setServicesTotalCount(res.count || data.length);
      setServicesTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: loadServicesPage', e); }
    finally { setLoadingServices(false); }
  };
  
  const filterServices = async (filters: any) => {
    setServicesFilters(filters);
    setServicesPage(1); // Reset to first page
    // Trigger fetch with new filters
    if (!user) return;
    setLoadingServices(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (servicesSearch) params.search = servicesSearch;
      if (filters.status) params.status = filters.status;
      if (filters.service_type) params.service_type = filters.service_type;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      
      const res = await capitalServiceService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setServices(data);
      setServicesPage(1);
      setServicesTotalCount(res.count || data.length);
      setServicesTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: filterServices', e); }
    finally { setLoadingServices(false); }
  };
  
  const searchServices = async (searchTerm: string) => {
    setServicesSearch(searchTerm);
    setServicesPage(1); // Reset to first page
    // Trigger fetch with new search
    if (!user) return;
    setLoadingServices(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (searchTerm) params.search = searchTerm;
      if (servicesFilters.status) params.status = servicesFilters.status;
      if (servicesFilters.service_type) params.service_type = servicesFilters.service_type;
      if (servicesFilters.assigned_to) params.assigned_to = servicesFilters.assigned_to;
      
      const res = await capitalServiceService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setServices(data);
      setServicesPage(1);
      setServicesTotalCount(res.count || data.length);
      setServicesTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: searchServices', e); }
    finally { setLoadingServices(false); }
  };

  const fetchLoans = async () => {
    if (!user) return;
    setLoadingLoans(true);
    try {
      // Build query params with filters and search
      const params: any = { page: 1, page_size: 100 };
      
      if (loansSearch) params.search = loansSearch;
      if (loansFilters.status) params.status = loansFilters.status;
      if (loansFilters.loan_type) params.loan_type = loansFilters.loan_type;
      if (loansFilters.assigned_to) params.assigned_to = loansFilters.assigned_to;
      
      const res = await capitalLoanService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setLoans(data);
      setLoansPage(1);
      setLoansTotalCount(res.count || data.length);
      setLoansTotalPages(Math.ceil((res.count || data.length) / 100));
      
      localStorage.setItem('capital_loans', JSON.stringify(data));
    } catch (e) { logger.error('Capital: fetchLoans', e); }
    finally { setLoadingLoans(false); }
  };
  
  const loadLoansPage = async (page: number) => {
    if (!user) return;
    setLoadingLoans(true);
    try {
      const params: any = { page, page_size: 100 };
      
      if (loansSearch) params.search = loansSearch;
      if (loansFilters.status) params.status = loansFilters.status;
      if (loansFilters.loan_type) params.loan_type = loansFilters.loan_type;
      if (loansFilters.assigned_to) params.assigned_to = loansFilters.assigned_to;
      
      const res = await capitalLoanService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setLoans(data);
      setLoansPage(page);
      setLoansTotalCount(res.count || data.length);
      setLoansTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: loadLoansPage', e); }
    finally { setLoadingLoans(false); }
  };
  
  const filterLoans = async (filters: any) => {
    setLoansFilters(filters);
    setLoansPage(1);
    if (!user) return;
    setLoadingLoans(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (loansSearch) params.search = loansSearch;
      if (filters.status) params.status = filters.status;
      if (filters.loan_type) params.loan_type = filters.loan_type;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      
      const res = await capitalLoanService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setLoans(data);
      setLoansPage(1);
      setLoansTotalCount(res.count || data.length);
      setLoansTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: filterLoans', e); }
    finally { setLoadingLoans(false); }
  };
  
  const searchLoans = async (searchTerm: string) => {
    setLoansSearch(searchTerm);
    setLoansPage(1);
    if (!user) return;
    setLoadingLoans(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      
      if (searchTerm) params.search = searchTerm;
      if (loansFilters.status) params.status = loansFilters.status;
      if (loansFilters.loan_type) params.loan_type = loansFilters.loan_type;
      if (loansFilters.assigned_to) params.assigned_to = loansFilters.assigned_to;
      
      const res = await capitalLoanService.list(params) as any;
      const data = Array.isArray(res) ? res : res.results || [];
      setLoans(data);
      setLoansPage(1);
      setLoansTotalCount(res.count || data.length);
      setLoansTotalPages(Math.ceil((res.count || data.length) / 100));
    } catch (e) { logger.error('Capital: searchLoans', e); }
    finally { setLoadingLoans(false); }
  };

  // Load cached data immediately on mount
  useEffect(() => {
    if (user) {
      // Load from cache first for instant display
      const cachedServices = localStorage.getItem('capital_services');
      const cachedLoans = localStorage.getItem('capital_loans');
      const cachedCustomers = localStorage.getItem('capital_customers');
      const cachedTasks = localStorage.getItem('capital_tasks');
      
      if (cachedServices) {
        try {
          setServices(JSON.parse(cachedServices));
        } catch (e) { /* ignore */ }
      }
      if (cachedLoans) {
        try {
          setLoans(JSON.parse(cachedLoans));
        } catch (e) { /* ignore */ }
      }
      if (cachedCustomers) {
        try {
          setCustomers(JSON.parse(cachedCustomers));
        } catch (e) { /* ignore */ }
      }
      if (cachedTasks) {
        try {
          setTasks(JSON.parse(cachedTasks));
        } catch (e) { /* ignore */ }
      }
      
      // Then fetch fresh data in parallel (in background)
      Promise.all([
        fetchEmployees(),
        fetchCustomers(),
        fetchTasks(),
        fetchLoans(),
        fetchServices()
      ]);
    }
  }, [user?.id]);

  // ── Customers ──────────────────────────────────────────────────────────
  const addCustomer = async (data: Partial<CapitalCustomer>) => {
    try {
      const res = await capitalCustomerService.create(data) as CapitalCustomer;
      setCustomers(p => [res, ...p]);
      toast.success('Customer added');
    } catch { toast.error('Failed to add customer'); }
  };

  const updateCustomer = async (id: string, data: Partial<CapitalCustomer>) => {
    try {
      const res = await capitalCustomerService.update(id, data) as CapitalCustomer;
      setCustomers(p => p.map(c => c.id === id ? res : c));
      toast.success('Customer updated');
    } catch { toast.error('Failed to update customer'); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await capitalCustomerService.delete(id);
      setCustomers(p => p.filter(c => c.id !== id));
      toast.success('Customer deleted');
    } catch { toast.error('Failed to delete customer'); }
  };

  const bulkImportCustomers = async (rows: any[]) => {
    try {
      const res = await capitalCustomerService.bulkImport(rows) as any;
      toast.success(`Imported ${res.imported} customers`);
      await fetchCustomers();
    } catch { toast.error('Failed to import customers'); }
  };

  const convertToLead = async (id: string) => {
    try {
      await capitalCustomerService.convertToLead(id);
      setCustomers(p => p.map(c => c.id === id ? { ...c, is_converted: true } : c));
      toast.success('Converted to lead');
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('Already converted')) toast.error('Already converted to a lead');
      else toast.error('Failed to convert to lead');
    }
  };

  const markCustomerConverted = (id: string) => {
    setCustomers(p => p.map(c => c.id === id ? { ...c, is_converted: true } : c));
  };

  // ── Tasks ──────────────────────────────────────────────────────────────
  const addTask = async (data: Partial<CapitalTask>) => {
    try {
      const res = await capitalTaskService.create(data) as CapitalTask;
      setTasks(p => [res, ...p]);
      toast.success('Task added');
    } catch { toast.error('Failed to add task'); }
  };

  const updateTask = async (id: string, data: Partial<CapitalTask>) => {
    try {
      const res = await capitalTaskService.update(id, data) as CapitalTask;
      setTasks(p => p.map(t => t.id === id ? res : t));
      toast.success('Task updated');
    } catch { toast.error('Failed to update task'); }
  };

  const deleteTask = async (id: string) => {
    try {
      await capitalTaskService.delete(id);
      setTasks(p => p.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const bulkImportTasks = async (rows: any[]) => {
    try {
      const res = await capitalTaskService.bulkImport(rows) as any;
      toast.success(`Imported ${res.imported} tasks`);
      await fetchTasks();
    } catch { toast.error('Failed to import tasks'); }
  };

  // ── Loans ──────────────────────────────────────────────────────────────
  const addLoan = async (data: Partial<CapitalLoan>) => {
    try {
      const res = await capitalLoanService.create(data) as CapitalLoan;
      setLoans(p => [res, ...p]);
      toast.success('Loan added');
    } catch (e: any) {
      // Parse error message to show specific details
      const errorMsg = e?.message || '';
      console.error('Add loan error:', errorMsg, e);
      
      try {
        // Try to parse the error details from the message
        const detailsMatch = errorMsg.match(/details: ({.*})/);
        if (detailsMatch) {
          const errorData = JSON.parse(detailsMatch[1]);
          
          // Check for validation errors (from serializer)
          if (errorData.phone) {
            toast.error(`Phone: ${errorData.phone}`);
            return;
          }
          
          if (errorData.loan_type) {
            toast.error(`Loan Type: ${errorData.loan_type}`);
            return;
          }
          
          if (errorData.applicant_name) {
            toast.error(`Name: ${errorData.applicant_name}`);
            return;
          }
          
          // Check for generic error message
          if (errorData.error) {
            toast.error(errorData.error);
            return;
          }
          
          // Check for any other field errors
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
            toast.error(`${firstErrorKey}: ${errorText}`);
            return;
          }
        }
      } catch (parseError) {
        console.error('Error parsing loan error:', parseError);
        // If parsing fails, check for common error patterns
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          toast.error('A loan of this type already exists for this phone number');
          return;
        }
        if (errorMsg.includes('required')) {
          toast.error('Please fill in all required fields');
          return;
        }
      }
      
      // Fallback to generic error
      toast.error('Failed to add loan. Please check all fields and try again.');
    }
  };

  const updateLoan = async (id: string, data: Partial<CapitalLoan>) => {
    try {
      const res = await capitalLoanService.update(id, data) as CapitalLoan;
      setLoans(p => p.map(l => l.id === id ? res : l));
      toast.success('Loan updated');
    } catch (e: any) {
      // Parse error message to show specific details
      const errorMsg = e?.message || '';
      
      try {
        // Try to parse the error details from the message
        const detailsMatch = errorMsg.match(/details: ({.*})/);
        if (detailsMatch) {
          const errorData = JSON.parse(detailsMatch[1]);
          
          // Check for validation errors (from serializer)
          if (errorData.phone) {
            toast.error(errorData.phone);
            return;
          }
          
          // Check for any field-specific errors
          const firstError = Object.values(errorData)[0];
          if (firstError) {
            toast.error(String(firstError));
            return;
          }
        }
      } catch (parseError) {
        // If parsing fails, show the raw error
        console.error('Update loan error:', errorMsg);
      }
      
      // Fallback to generic error
      toast.error('Failed to update loan');
    }
  };

  const deleteLoan = async (id: string) => {
    try {
      await capitalLoanService.delete(id);
      setLoans(p => p.filter(l => l.id !== id));
      toast.success('Loan deleted');
    } catch { toast.error('Failed to delete loan'); }
  };

  const bulkImportLoans = async (rows: any[]) => {
    try {
      const res = await capitalLoanService.bulkImport(rows) as any;
      toast.success(`Imported ${res.imported} loans`);
      await fetchLoans();
    } catch { toast.error('Failed to import loans'); }
  };

  // ── Services ──────────────────────────────────────────────────────────
  const addService = async (data: Partial<CapitalService>) => {
    try {
      const res = await capitalServiceService.create(data) as CapitalService;
      setServices(p => [res, ...p]);
      toast.success('Service added');
    } catch (e: any) {
      // Parse error message to show specific details
      const errorMsg = e?.message || '';
      console.error('Add service error:', errorMsg, e);
      
      try {
        // Try to parse the error details from the message
        const detailsMatch = errorMsg.match(/details: ({.*})/);
        if (detailsMatch) {
          const errorData = JSON.parse(detailsMatch[1]);
          
          // Check for validation errors (from serializer)
          if (errorData.phone) {
            toast.error(`Phone: ${errorData.phone}`);
            return;
          }
          
          if (errorData.service_type) {
            toast.error(`Service Type: ${errorData.service_type}`);
            return;
          }
          
          if (errorData.client_name) {
            toast.error(`Name: ${errorData.client_name}`);
            return;
          }
          
          if (errorData.financial_year) {
            toast.error(`Financial Year: ${errorData.financial_year}`);
            return;
          }
          
          // Check for generic error message
          if (errorData.error) {
            toast.error(errorData.error);
            return;
          }
          
          // Check for any other field errors
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
            toast.error(`${firstErrorKey.replace(/_/g, ' ')}: ${errorText}`);
            return;
          }
        }
      } catch (parseError) {
        console.error('Error parsing service error:', parseError);
        // If parsing fails, check for common error patterns
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          toast.error('A service record already exists for this phone number, service type, and financial year');
          return;
        }
        if (errorMsg.includes('required')) {
          toast.error('Please fill in all required fields');
          return;
        }
      }
      
      // Fallback to generic error
      toast.error('Failed to add service. Please check all fields and try again.');
    }
  };

  const updateService = async (id: string, data: Partial<CapitalService>) => {
    try {
      const res = await capitalServiceService.update(id, data) as CapitalService;
      setServices(p => p.map(s => s.id === id ? res : s));
      toast.success('Service updated');
    } catch (e: any) {
      // Parse error message to show specific details
      const errorMsg = e?.message || '';
      console.error('Update service error:', errorMsg, e);
      
      try {
        // Try to parse the error details from the message
        const detailsMatch = errorMsg.match(/details: ({.*})/);
        if (detailsMatch) {
          const errorData = JSON.parse(detailsMatch[1]);
          
          // Check for validation errors (from serializer)
          if (errorData.phone) {
            toast.error(errorData.phone);
            return;
          }
          
          // Check for any field-specific errors
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
            toast.error(`${firstErrorKey.replace(/_/g, ' ')}: ${errorText}`);
            return;
          }
        }
      } catch (parseError) {
        console.error('Error parsing service update error:', parseError);
      }
      
      // Fallback to generic error
      toast.error('Failed to update service');
    }
  };

  const deleteService = async (id: string) => {
    try {
      await capitalServiceService.delete(id);
      setServices(p => p.filter(s => s.id !== id));
      toast.success('Service deleted');
    } catch { toast.error('Failed to delete service'); }
  };

  const bulkImportServices = async (rows: any[]) => {
    try {
      const res = await capitalServiceService.bulkImport(rows) as any;
      toast.success(`Imported ${res.imported} services`);
      await fetchServices();
    } catch { toast.error('Failed to import services'); }
  };

  return (
    <CapitalContext.Provider value={{
      customers, tasks, loans, services, employees,
      currentUserId, currentUserRole,
      loadingCustomers, loadingTasks, loadingLoans, loadingServices,
      servicesPage, servicesTotalPages, servicesTotalCount,
      loansPage, loansTotalPages, loansTotalCount,
      customersPage, customersTotalPages, customersTotalCount,
      loadServicesPage, loadLoansPage, loadCustomersPage,
      filterServices, searchServices,
      filterLoans, searchLoans,
      filterCustomers, searchCustomers,
      addCustomer, updateCustomer, deleteCustomer, bulkImportCustomers, convertToLead, markCustomerConverted, refreshCustomers: fetchCustomers,
      addTask, updateTask, deleteTask, bulkImportTasks, refreshTasks: fetchTasks,
      addLoan, updateLoan, deleteLoan, bulkImportLoans, refreshLoans: fetchLoans,
      addService, updateService, deleteService, bulkImportServices, refreshServices: fetchServices,
    }}>
      {children}
    </CapitalContext.Provider>
  );
}
