import TopBar from '@/components/layout/TopBar';
import CustomerList from '@/components/customers/CustomerList';
import { useCustomers } from '@/contexts/CustomerContext';
import { useData } from '@/contexts/DataContextDjango';

export default function ManagerCustomers() {
  const { projects } = useData();
  const {
    customers,
    employees,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    bulkImportCustomers,
    convertToLead,
    createLeadFromCustomer,
    refreshCustomers,
  } = useCustomers();

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Customer Management" 
        subtitle="Manage team customers and call allocations" 
      />
      <div className="p-3 sm:p-4 md:p-6">
        <CustomerList
          customers={customers}
          employees={employees}
          projects={projects}
          onAddCustomer={addCustomer}
          onUpdateCustomer={updateCustomer}
          onDeleteCustomer={deleteCustomer}
          onBulkImport={bulkImportCustomers}
          onConvertToLead={convertToLead}
          onCreateLead={createLeadFromCustomer}
          onRefreshCustomers={refreshCustomers}
          canManageAll={true}
        />
      </div>
    </div>
  );
}