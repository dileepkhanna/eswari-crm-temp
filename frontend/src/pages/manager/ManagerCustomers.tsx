import TopBar from '@/components/layout/TopBar';
import CustomerList from '@/components/customers/CustomerList';
import { useCustomers } from '@/contexts/CustomerContext';
import { useData } from '@/contexts/DataContextDjango';

export default function ManagerCustomers() {
  const { projects } = useData();
  const {
    customers,
    employees,
    refreshCustomers,
  } = useCustomers();

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Customer Management" 
        subtitle="View assigned customers and call allocations" 
      />
      <div className="p-3 sm:p-4 md:p-6">
        <CustomerList
          customers={customers}
          employees={employees}
          projects={projects}
          onAddCustomer={() => {}} // Disabled for managers
          onUpdateCustomer={() => {}} // Disabled for managers - no edit functionality
          onDeleteCustomer={() => {}} // Disabled for managers
          onBulkImport={() => {}} // Disabled for managers
          onConvertToLead={() => {}} // Disabled for managers - no convert functionality
          onCreateLead={() => {}} // Disabled for managers - no convert functionality
          onRefreshCustomers={refreshCustomers}
          canManageAll={false} // Managers cannot manage all customers
          isManagerView={true} // New prop to indicate this is manager view
        />
      </div>
    </div>
  );
}