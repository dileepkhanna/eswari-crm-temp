import TopBar from "@/components/layout/TopBar";
import LeadList from "@/components/leads/LeadList";
import { useCustomers } from "@/contexts/CustomerContext";

export default function AdminLeads() {
  const { employees } = useCustomers();

  return (
    <div className="min-h-screen">
      <TopBar title="Lead Management" subtitle="View and manage all leads" />
      <div className="p-4 md:p-6">
        <LeadList canCreate canEdit canConvert employees={employees} />
      </div>
    </div>
  );
}
