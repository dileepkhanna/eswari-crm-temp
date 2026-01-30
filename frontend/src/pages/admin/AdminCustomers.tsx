import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import CustomerList from '@/components/customers/CustomerList';
import CustomerAssignmentModal from '@/components/admin/CustomerAssignmentModal';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/contexts/CustomerContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useData } from '@/contexts/DataContextDjango';
import { Users } from 'lucide-react';

export default function AdminCustomers() {
  const { user } = useAuth();
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

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const handleAssignmentComplete = () => {
    refreshCustomers();
  };

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Customer Management" 
        subtitle="Manage customer database and call tracking"
      />
      <div className="p-3 sm:p-4 md:p-6">
        {/* Assignment Management Button */}
        <div className="mb-4 flex justify-end">
          <Button 
            onClick={() => setShowAssignmentModal(true)}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Customer Assignments
          </Button>
        </div>

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

      <CustomerAssignmentModal
        open={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
}