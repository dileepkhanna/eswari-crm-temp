import TopBar from '@/components/layout/TopBar';
import LeaveList from '@/components/leaves/LeaveList';

export default function StaffLeaves() {
  return (
    <div className="min-h-screen">
      <TopBar title="My Leaves" subtitle="Apply and track leave requests" />
      <div className="p-6">
        <LeaveList canApprove={false} canCreate={true} />
      </div>
    </div>
  );
}
