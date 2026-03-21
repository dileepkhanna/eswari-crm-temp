import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Customer, CallAllocation, User, Lead } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData, apiToLead } from '@/contexts/DataContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { CallStatus } from '@/types/customer';

import { logger } from '@/lib/logger';
interface CustomerContextType {
  customers: Customer[];
  employees: User[];
  callAllocations: CallAllocation[];
  loading: boolean;
  addCustomer: (customer: Partial<Customer>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  bulkImportCustomers: (customers: Partial<Customer>[]) => Promise<void>;
  convertToLead: (customerId: string) => Promise<void>;
  createLeadFromCustomer: (leadData: any) => Promise<void>; // Add new function
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}

interface CustomerProviderProps {
  children: React.ReactNode;
}

export function CustomerProvider({ children }: CustomerProviderProps) {
  const { user } = useAuth();
  const { addLeadToState } = useData(); // Use addLeadToState for immediate state update
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [callAllocations, setCallAllocations] = useState<CallAllocation[]>([]);
  const [loading, setLoading] = useState(false); // Start with false for immediate UI
  
  // Add caching mechanism
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(false); // Start with false
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Fetch real users from the API filtered by current company
  const fetchUsers = async (forceRefresh = false) => {
    const now = Date.now();
    const isCacheValid = !forceRefresh && (now - lastFetchTime) < CACHE_DURATION && employees.length > 0;
    if (isCacheValid) return;
    
    try {
      // Filter users by the current company so cross-company employees don't appear
      const companyId = selectedCompany?.id || user?.company?.id;
      const response = await apiClient.getUsers(companyId ? { company: companyId } : undefined);
      
      // Handle both paginated and non-paginated responses
      let usersData: any[];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && (response as any).results) {
        usersData = (response as any).results;
      } else {
        usersData = [];
      }
      
      // Transform Django user data to match frontend interface
      const transformedUsers: User[] = usersData.map((user: any) => {
        
        // Create a fallback name if username is missing
        let displayName = '';
        if (user.first_name || user.last_name) {
          displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        if (!displayName && user.username) {
          displayName = user.username;
        }
        if (!displayName && user.email) {
          displayName = user.email.split('@')[0];
        }
        if (!displayName) {
          displayName = `User ${user.id}`;
        }
        
        return {
          id: user.id.toString(),
          userId: user.username || `user_${user.id}`,
          name: displayName,
          phone: user.phone || '',
          address: user.address || '',
          role: user.role as 'admin' | 'manager' | 'employee',
          status: 'active',
          permissions: [],
          createdAt: new Date(user.created_at || Date.now()),
        };
      });
      
      // Filter employees and managers (admins can assign to both)
      const employeeUsers = transformedUsers.filter((u: User) => 
        u.role === 'employee' || u.role === 'manager' || (u.role as string) === 'telecaller'
      );
      setEmployees(employeeUsers);
      
      // Cache employees data to localStorage
      try {
        localStorage.setItem(`employees_${user?.id}`, JSON.stringify(employeeUsers));
      } catch (error) {
        logger.error('❌ Error caching employee data:', error);
      }
    } catch (error) {
      logger.error('Error fetching users:', error);
      // Don't clear existing employees on error
      if (employees.length === 0) {
        setEmployees([]);
      }
    }
  };

  // Fetch customers from API with pagination
  const fetchCustomers = async (forceRefresh = false) => {
    if (!user) return;
    
    const now = Date.now();
    const isCacheValid = !forceRefresh && (now - lastFetchTime) < CACHE_DURATION && customers.length > 0;
    if (isCacheValid) return;
    
    try {
      if (forceRefresh && customers.length === 0) setLoading(true);
      
      // Fetch all pages so employees see all their assigned customers
      let allCustomers: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiClient.getCustomers({ page, page_size: 100 } as any);
        let pageData: any[];
        if (Array.isArray(response)) {
          pageData = response;
          hasMore = false;
        } else if ((response as any).results) {
          pageData = (response as any).results;
          hasMore = !!(response as any).next;
        } else {
          pageData = [];
          hasMore = false;
        }
        allCustomers = allCustomers.concat(pageData);
        page++;
        if (page > 20) break; // safety cap
      }
      
      const transformedCustomers: Customer[] = allCustomers.map((customer: any) => ({
        id: customer.id.toString(),
        name: customer.name,
        phone: customer.phone,
        callStatus: customer.call_status as CallStatus,
        customCallStatus: customer.custom_call_status,
        assignedTo: customer.assigned_to ? customer.assigned_to.toString() : undefined,
        assignedToName: customer.assigned_to_name,
        createdBy: customer.created_by.toString(),
        createdByName: customer.created_by_name,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at),
        scheduledDate: customer.scheduled_date ? new Date(customer.scheduled_date) : undefined,
        callDate: customer.call_date ? new Date(customer.call_date) : undefined,
        notes: customer.notes,
        isConverted: customer.is_converted,
        convertedLeadId: customer.converted_lead_id,
      }));
      
      setCustomers(transformedCustomers);
      setLastFetchTime(now);
      setLoading(false);
      
      if (user) {
        try {
          localStorage.setItem(`customers_${user.id}`, JSON.stringify(transformedCustomers));
        } catch {}
      }
    } catch (error) {
      logger.error('❌ Error fetching customers:', error);
      if (error instanceof Error && error.message.includes('401')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      if (isInitialLoad) setCustomers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // HR users don't have access to customers module
      if (user.role === 'hr') {
        logger.log('👤 HR user detected - skipping customer data fetch');
        setCustomers([]);
        setEmployees([]);
        return;
      }
      
      // Load cached data immediately for instant UI
      const cachedCustomers = localStorage.getItem(`customers_${user.id}`);
      const cachedEmployees = localStorage.getItem(`employees_${user.id}`);
      
      if (cachedCustomers && cachedEmployees) {
        try {
          const parsedCustomers = JSON.parse(cachedCustomers);
          const parsedEmployees = JSON.parse(cachedEmployees);
          
          // Convert date strings back to Date objects
          const restoredCustomers = parsedCustomers.map((customer: any) => ({
            ...customer,
            createdAt: new Date(customer.createdAt),
            updatedAt: new Date(customer.updatedAt),
            scheduledDate: customer.scheduledDate ? new Date(customer.scheduledDate) : undefined,
            callDate: customer.callDate ? new Date(customer.callDate) : undefined,
          }));
          
          const restoredEmployees = parsedEmployees.map((employee: any) => ({
            ...employee,
            createdAt: new Date(employee.createdAt),
          }));
          
          // Set cached data immediately
          setCustomers(restoredCustomers);
          setEmployees(restoredEmployees);
          setLastFetchTime(Date.now() - CACHE_DURATION + 5000); // Mark as slightly stale
        } catch (error) {
          logger.error('❌ Error parsing cached data:', error);
        }
      }
      
      // Fetch fresh data in background (non-blocking)
      setTimeout(() => {
        Promise.all([
          fetchUsers(),
          fetchCustomers()
        ]).catch(error => {
          logger.error('❌ Error during background data fetch:', error);
        });
      }, 100); // Small delay to allow UI to render first
    } else {
      setCustomers([]);
      setEmployees([]);
    }
  }, [user?.id]); // Only depend on user.id to prevent infinite loops

  const addCustomer = useCallback(async (customerData: Partial<Customer>) => {
    try {
      // Validate required fields
      if (!customerData.phone?.trim()) {
        throw new Error('Phone number is required');
      }

      // Get company ID - use selectedCompany or user's company
      const companyId = selectedCompany?.id || user?.company?.id;
      if (!companyId) {
        throw new Error('Company information is required');
      }
      
      // Auto-assign to current user if they are a manager and no assignment is specified
      let assignedTo = customerData.assignedTo;
      if (!assignedTo && user?.role === 'manager') {
        assignedTo = user.id;
      }
      
      const apiData = {
        name: customerData.name,
        phone: customerData.phone.trim(),
        call_status: customerData.callStatus || 'pending',
        custom_call_status: customerData.customCallStatus,
        company: companyId, // Add company field
        assigned_to: assignedTo ? parseInt(assignedTo) : null,
        scheduled_date: customerData.scheduledDate?.toISOString(),
        notes: customerData.notes,
      };
      
      logger.log('🔄 Creating customer with data:', apiData);
      const response = await apiClient.createCustomer(apiData);
      logger.log('✅ Customer created successfully:', response);

      // Refresh customers list to show the new customer
      await fetchCustomers();
      toast.success('Customer added successfully');
    } catch (error) {
      logger.error('❌ Error adding customer:', error);
      
      // Handle duplicate phone number error
      if (error instanceof Error && error.message.includes('phone')) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          toast.error('A customer with this phone number already exists');
        } else {
          toast.error('Invalid phone number format');
        }
      } else if (error instanceof Error && error.message.includes('Company')) {
        toast.error('Company information is missing. Please try again.');
      } else {
        toast.error('Failed to add customer');
      }
      
      // Log more details about the error
      if (error instanceof Error) {
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
      }
    }
  }, [user, selectedCompany]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      
      // Check if customer exists in our local state first
      const existingCustomer = customers.find(c => c.id === id);
      if (!existingCustomer) {
        logger.error('❌ Customer not found in local state:', id);
        toast.error('Customer not found. The data may have been updated by another user.');
        // Refresh customers to get latest data
        await fetchCustomers();
        return;
      }
      
      // Optimistically update the local state immediately
      const updatedCustomer = {
        ...existingCustomer,
        ...data,
        updatedAt: new Date()
      };
      
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === id ? updatedCustomer : customer
        )
      );
      
      // Only include fields that are actually being updated
      const apiData: any = {};
      
      if (data.name !== undefined) apiData.name = data.name;
      if (data.phone !== undefined) apiData.phone = data.phone;
      if (data.callStatus !== undefined) apiData.call_status = data.callStatus;
      if (data.customCallStatus !== undefined) apiData.custom_call_status = data.customCallStatus;
      if (data.assignedTo !== undefined) {
        apiData.assigned_to = data.assignedTo ? parseInt(data.assignedTo) : null;
      }
      if (data.scheduledDate !== undefined) {
        apiData.scheduled_date = data.scheduledDate?.toISOString();
      }
      if (data.callDate !== undefined) {
        apiData.call_date = data.callDate?.toISOString();
      }
      if (data.notes !== undefined) apiData.notes = data.notes;
      
      const response = await apiClient.updateCustomer(id, apiData);

      // Update with the actual server response
      const serverUpdatedCustomer = {
        id: response.id.toString(),
        name: response.name,
        phone: response.phone,
        callStatus: response.call_status as CallStatus,
        customCallStatus: response.custom_call_status,
        assignedTo: response.assigned_to ? response.assigned_to.toString() : undefined,
        assignedToName: response.assigned_to_name,
        createdBy: response.created_by.toString(),
        createdByName: response.created_by_name,
        createdAt: new Date(response.created_at),
        updatedAt: new Date(response.updated_at),
        scheduledDate: response.scheduled_date ? new Date(response.scheduled_date) : undefined,
        callDate: response.call_date ? new Date(response.call_date) : undefined,
        notes: response.notes,
        isConverted: response.is_converted,
        convertedLeadId: response.converted_lead_id,
      };
      
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === id ? serverUpdatedCustomer : customer
        )
      );
      
      toast.success('Customer updated successfully');
    } catch (error) {
      logger.error('❌ Error updating customer:', error);
      
      // Revert optimistic update on error
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer.id === id ? (customers.find(c => c.id === id) || customer) : customer
        )
      );
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          toast.error('Customer not found. It may have been deleted by another user.');
          // Refresh customers to get latest data
          await fetchCustomers();
        } else if (error.message.includes('403')) {
          toast.error('You do not have permission to update this customer.');
        } else if (error.message.includes('phone')) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            toast.error('A customer with this phone number already exists');
          } else {
            toast.error('Invalid phone number format');
          }
        } else {
          toast.error('Failed to update customer. Please try again.');
        }
        
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
      } else {
        toast.error('Failed to update customer');
      }
    }
  }, [customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await apiClient.deleteCustomer(id);
      await fetchCustomers();
      toast.success('Customer deleted successfully');
    } catch (error) {
      logger.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  }, []);

  const bulkImportCustomers = useCallback(async (customersData: Partial<Customer>[]) => {
    try {
      const apiCustomers = customersData.map(customer => {
        // Auto-assign imported customers to current user if they are employee or manager
        let assignedTo = customer.assignedTo ? parseInt(customer.assignedTo) : null;
        
        if (user?.role === 'employee' || user?.role === 'manager') {
          assignedTo = parseInt(user.id);
        }
        
        return {
          name: customer.name,
          phone: customer.phone!,
          call_status: customer.callStatus || 'pending',
          custom_call_status: customer.customCallStatus,
          assigned_to: assignedTo,
          scheduled_date: customer.scheduledDate?.toISOString(),
          notes: customer.notes,
        };
      });

      const response = await apiClient.bulkImportCustomers(apiCustomers);
      await fetchCustomers();
      
      if (response.errors && response.errors.length > 0) {
        const duplicateCount = response.duplicates || 0;
        const errorCount = response.errors.length - duplicateCount;
        
        let message = '';
        if (duplicateCount > 0 && errorCount > 0) {
          message = `Import completed with ${errorCount} error(s) and ${duplicateCount} duplicate(s) skipped. Check console for details.`;
        } else if (duplicateCount > 0) {
          message = `Import completed with ${duplicateCount} duplicate phone number(s) skipped. Check console for details.`;
        } else {
          message = `Import completed with ${errorCount} error(s). Check console for details.`;
        }
        
        toast.warning(message);
        logger.error('Import issues:', response.errors);
      }
      
      if (response.created > 0) {
        const successMessage = (user?.role === 'employee' || user?.role === 'manager')
          ? `${response.created} customers imported and assigned to you successfully`
          : `${response.created} customers imported successfully`;
        toast.success(successMessage);
      } else if (!response.errors || response.errors.length === 0) {
        toast.info('No new customers were imported');
      }
    } catch (error) {
      logger.error('Error importing customers:', error);
      toast.error('Failed to import customers');
    }
  }, [user]);

  const convertToLead = useCallback(async (customerId: string) => {
    try {
      await apiClient.convertCustomerToLead(customerId);
      await fetchCustomers();
      // Don't show success toast here as it will be shown by the calling component
    } catch (error) {
      logger.error('Error converting customer to lead:', error);
      toast.error('Failed to convert customer to lead');
    }
  }, []);

  const createLeadFromCustomer = useCallback(async (leadData: any) => {
    try {
      
      // Auto-assign to current user if they are an employee and no assignment is specified
      let assignedTo = leadData.assignedTo;
      if (!assignedTo && user?.role === 'employee') {
        assignedTo = parseInt(user.id);
      }
      
      const apiData = {
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email || '',
        address: leadData.address || '',
        requirement_type: leadData.requirementType || 'apartment',
        bhk_requirement: leadData.bhkRequirement || '2',
        budget_min: leadData.budgetMin || 0,
        budget_max: leadData.budgetMax || 0,
        description: leadData.description || '',
        preferred_location: leadData.preferredLocation || '',
        status: leadData.status || 'new',
        source: leadData.source || 'customer_conversion',
        assigned_to: assignedTo, // Use the auto-assigned value
        assigned_projects: leadData.assignedProjects || [], // New multiple projects field
        assigned_project: leadData.assignedProject || null, // Keep for backward compatibility
        follow_up_date: leadData.followUpDate?.toISOString() || null,
      };
      
      const response = await apiClient.createLead(apiData);
      
      // Convert API response to Lead object and add directly to DataContext state
      const convertedLead = apiToLead(response);
      
      // Use addLeadToState for immediate state update without optimistic loading
      addLeadToState(convertedLead);
      
      // Don't show success toast here as it will be shown by the calling component
    } catch (error) {
      logger.error('❌ Error creating lead from customer:', error);
      throw error; // Re-throw to let the calling component handle the error
    }
  }, [addLeadToState, user]);

  const refreshCustomers = useCallback(async () => {
    if (!user) {
      return;
    }
    
    try {
      setLoading(true);
      // Force refresh both users and customers
      await Promise.all([
        fetchUsers(true), // Force refresh
        fetchCustomers(true) // Force refresh
      ]);
    } catch (error) {
      logger.error('❌ Error refreshing customers:', error);
      toast.error('Failed to refresh customer data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Only depend on user.id

  const value: CustomerContextType = {
    customers,
    employees,
    callAllocations,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    bulkImportCustomers,
    convertToLead,
    createLeadFromCustomer,
    refreshCustomers,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}