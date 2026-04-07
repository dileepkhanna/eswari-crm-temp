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
      const res = await capitalCustomerService.list({ page_size: 500 }) as any;
      setCustomers(Array.isArray(res) ? res : res.results || []);
    } catch (e) { logger.error('Capital: fetchCustomers', e); }
    finally { setLoadingCustomers(false); }
  };

  const fetchTasks = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const res = await capitalTaskService.list({ page_size: 500 }) as any;
      setTasks(Array.isArray(res) ? res : res.results || []);
    } catch (e) { logger.error('Capital: fetchTasks', e); }
    finally { setLoadingTasks(false); }
  };

  const fetchServices = async () => {
    if (!user) return;
    setLoadingServices(true);
    try {
      const res = await capitalServiceService.list({ page_size: 500 }) as any;
      setServices(Array.isArray(res) ? res : res.results || []);
    } catch (e) { logger.error('Capital: fetchServices', e); }
    finally { setLoadingServices(false); }
  };

  const fetchLoans = async () => {
    if (!user) return;
    setLoadingLoans(true);
    try {
      const res = await capitalLoanService.list({ page_size: 500 }) as any;
      setLoans(Array.isArray(res) ? res : res.results || []);
    } catch (e) { logger.error('Capital: fetchLoans', e); }
    finally { setLoadingLoans(false); }
  };

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchCustomers();
      fetchTasks();
      fetchLoans();
      fetchServices();
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
    } catch { toast.error('Failed to add loan'); }
  };

  const updateLoan = async (id: string, data: Partial<CapitalLoan>) => {
    try {
      const res = await capitalLoanService.update(id, data) as CapitalLoan;
      setLoans(p => p.map(l => l.id === id ? res : l));
      toast.success('Loan updated');
    } catch { toast.error('Failed to update loan'); }
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
    } catch { toast.error('Failed to add service'); }
  };

  const updateService = async (id: string, data: Partial<CapitalService>) => {
    try {
      const res = await capitalServiceService.update(id, data) as CapitalService;
      setServices(p => p.map(s => s.id === id ? res : s));
      toast.success('Service updated');
    } catch { toast.error('Failed to update service'); }
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
      addCustomer, updateCustomer, deleteCustomer, bulkImportCustomers, convertToLead, markCustomerConverted, refreshCustomers: fetchCustomers,
      addTask, updateTask, deleteTask, bulkImportTasks, refreshTasks: fetchTasks,
      addLoan, updateLoan, deleteLoan, bulkImportLoans, refreshLoans: fetchLoans,
      addService, updateService, deleteService, bulkImportServices, refreshServices: fetchServices,
    }}>
      {children}
    </CapitalContext.Provider>
  );
}
