import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Customer, CallAllocation, User } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { CallStatus } from '@/types/customer';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [callAllocations, setCallAllocations] = useState<CallAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real users from the API
  const fetchUsers = useCallback(async () => {
    try {
      console.log('🔄 Fetching users from API...');
      const response = await apiClient.getUsers();
      console.log('📥 Raw API response:', response);
      
      // Handle both paginated and non-paginated responses
      let usersData: any[];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && (response as any).results) {
        usersData = (response as any).results;
      } else {
        usersData = [];
      }
      
      console.log('👥 All users:', usersData);
      
      // Transform Django user data to match frontend interface
      const transformedUsers: User[] = usersData.map((user: any) => {
        console.log('👤 User:', user.username, 'Role:', user.role, 'ID:', user.id);
        
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
      
      // Filter only employees
      const employeeUsers = transformedUsers.filter((u: User) => u.role === 'employee');
      console.log('✅ Filtered employees:', employeeUsers);
      console.log('✅ Employee details:', employeeUsers.map(emp => ({ id: emp.id, name: emp.name, userId: emp.userId })));
      setEmployees(employeeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setEmployees([]);
    }
  }, []);

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await apiClient.getCustomers();
      console.log('Raw customers API response:', response);
      
      // Handle paginated response from Django REST Framework
      let customersData: any[];
      if (Array.isArray(response)) {
        // Direct array response
        customersData = response;
      } else if (response && (response as any).results) {
        // Paginated response: { count, next, previous, results }
        customersData = (response as any).results;
      } else {
        console.warn('Unexpected API response structure:', response);
        customersData = [];
      }
      
      console.log('Customers data to transform:', customersData);
      
      // Transform API response to frontend format
      const transformedCustomers: Customer[] = customersData.map((customer: any) => {
        const transformedCustomer = {
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
        };
        
        console.log(`📋 Customer ${customer.phone}: assigned_to=${customer.assigned_to}, assignedTo=${transformedCustomer.assignedTo}, assignedToName=${transformedCustomer.assignedToName}`);
        return transformedCustomer;
      });
      
      console.log('Transformed customers:', transformedCustomers);
      setCustomers(transformedCustomers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchCustomers();
    }
  }, [user, fetchUsers, fetchCustomers]);

  const addCustomer = useCallback(async (customerData: Partial<Customer>) => {
    try {
      console.log('🔄 Creating customer with data:', customerData);
      
      const apiData = {
        name: customerData.name,
        phone: customerData.phone!,
        call_status: customerData.callStatus || 'pending',
        custom_call_status: customerData.customCallStatus,
        assigned_to: customerData.assignedTo ? parseInt(customerData.assignedTo) : null,
        scheduled_date: customerData.scheduledDate?.toISOString(),
        notes: customerData.notes,
      };
      
      console.log('📤 Sending API request with:', apiData);
      
      const response = await apiClient.createCustomer(apiData);
      console.log('✅ Customer creation response:', response);

      // Refresh customers list
      await fetchCustomers();
      toast.success('Customer added successfully');
    } catch (error) {
      console.error('❌ Error adding customer:', error);
      
      // Handle duplicate phone number error
      if (error instanceof Error && error.message.includes('phone')) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          toast.error('A customer with this phone number already exists');
        } else {
          toast.error('Invalid phone number format');
        }
      } else {
        toast.error('Failed to add customer');
      }
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }, [fetchCustomers]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      console.log('🔄 Updating customer with ID:', id);
      console.log('📝 Update data:', data);
      
      // Check if customer exists in our local state first
      const existingCustomer = customers.find(c => c.id === id);
      if (!existingCustomer) {
        console.error('❌ Customer not found in local state:', id);
        toast.error('Customer not found. The data may have been updated by another user.');
        // Refresh customers to get latest data
        await fetchCustomers();
        return;
      }
      
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
      
      console.log('📤 Sending API update request with:', apiData);
      
      const response = await apiClient.updateCustomer(id, apiData);
      console.log('✅ Customer update response:', response);

      // Refresh customers list
      await fetchCustomers();
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      
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
        
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        toast.error('Failed to update customer');
      }
    }
  }, [fetchCustomers, customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await apiClient.deleteCustomer(id);
      await fetchCustomers();
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  }, [fetchCustomers]);

  const bulkImportCustomers = useCallback(async (customersData: Partial<Customer>[]) => {
    try {
      const apiCustomers = customersData.map(customer => {
        // For employees, automatically assign imported customers to themselves
        let assignedTo = customer.assignedTo ? parseInt(customer.assignedTo) : null;
        
        if (user?.role === 'employee') {
          assignedTo = parseInt(user.id);
          console.log(`🔄 Auto-assigning imported customer ${customer.phone} to employee ${user.name} (ID: ${user.id})`);
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

      console.log(`📤 Importing ${apiCustomers.length} customers with auto-assignment for ${user?.role}`);
      
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
        console.error('Import issues:', response.errors);
      }
      
      if (response.created > 0) {
        const successMessage = user?.role === 'employee' 
          ? `${response.created} customers imported and assigned to you successfully`
          : `${response.created} customers imported successfully`;
        toast.success(successMessage);
      } else if (!response.errors || response.errors.length === 0) {
        toast.info('No new customers were imported');
      }
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error('Failed to import customers');
    }
  }, [fetchCustomers, user]);

  const convertToLead = useCallback(async (customerId: string) => {
    try {
      await apiClient.convertCustomerToLead(customerId);
      await fetchCustomers();
      // Don't show success toast here as it will be shown by the calling component
    } catch (error) {
      console.error('Error converting customer to lead:', error);
      toast.error('Failed to convert customer to lead');
    }
  }, [fetchCustomers]);

  const createLeadFromCustomer = useCallback(async (leadData: any) => {
    try {
      console.log('🔄 Creating lead from customer with data:', leadData);
      
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
        assigned_projects: leadData.assignedProjects || [], // New multiple projects field
        assigned_project: leadData.assignedProject || null, // Keep for backward compatibility
        follow_up_date: leadData.followUpDate?.toISOString() || null,
      };
      
      console.log('📤 Sending lead creation API request with:', apiData);
      
      const response = await apiClient.createLead(apiData);
      console.log('✅ Lead creation response:', response);
      
      // Don't show success toast here as it will be shown by the calling component
    } catch (error) {
      console.error('❌ Error creating lead from customer:', error);
      throw error; // Re-throw to let the calling component handle the error
    }
  }, []);

  const refreshCustomers = useCallback(async () => {
    try {
      setLoading(true);
      await fetchCustomers();
    } catch (error) {
      console.error('Error refreshing customers:', error);
      toast.error('Failed to refresh customer data');
    } finally {
      setLoading(false);
    }
  }, [fetchCustomers]);

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