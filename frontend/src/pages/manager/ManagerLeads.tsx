import TopBar from "@/components/layout/TopBar";
import LeadList from "@/components/leads/LeadList";

export default function ManagerLeads() {
  return (
    <div className="min-h-screen">
      <TopBar title="Leads" subtitle="Manage leads" />
      <div className="p-4 md:p-6">
        <LeadList canCreate canEdit canConvert isManagerView />
      </div>
    </div>
  );
}
