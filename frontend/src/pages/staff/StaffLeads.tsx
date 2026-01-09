import TopBar from "@/components/layout/TopBar";
import LeadList from "@/components/leads/LeadList";

export default function StaffLeads() {
  return (
    <div className="min-h-screen">
      <TopBar title="Leads" subtitle="Create and manage leads" />
      <div className="p-4 md:p-6">
        <LeadList canCreate canEdit canConvert />
      </div>
    </div>
  );
}
