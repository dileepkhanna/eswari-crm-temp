import TopBar from '@/components/layout/TopBar';
import LeaveList from '@/components/leaves/LeaveList';

export default function ManagerLeaves() {
  return (
    <div className="min-h-screen">
      <TopBar title="Leave Approvals" subtitle="Approve staff leave requests" />
      <div className="p-6">
        <LeaveList canApprove={true} canCreate={false} canDelete={true} showOnlyPending={true} />
      </div>
    </div>
  );
}
