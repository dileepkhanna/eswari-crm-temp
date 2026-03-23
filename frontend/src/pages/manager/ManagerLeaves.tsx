import TopBar from '@/components/layout/TopBar';
import LeaveList from '@/components/leaves/LeaveList';

export default function ManagerLeaves() {
  return (
    <div className="min-h-screen">
      <TopBar title="Leave Management" subtitle="Manage and approve staff leave requests" />
      <div className="p-3 md:p-6">
        <LeaveList canApprove={true} canCreate={true} canDelete={true} showOnlyPending={false} />
      </div>
    </div>
  );
}
