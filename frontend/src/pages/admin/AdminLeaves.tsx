import TopBar from '@/components/layout/TopBar';
import LeaveList from '@/components/leaves/LeaveList';

export default function AdminLeaves() {
  return (
    <div className="min-h-screen">
      <TopBar title="Leave Management" subtitle="Approve and manage leave requests" />
      <div className="p-6">
        <LeaveList canApprove={true} canCreate={false} canDelete={true} />
      </div>
    </div>
  );
}
