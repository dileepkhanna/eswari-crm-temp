import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';

export default function AdminUsers() {
  return (
    <div className="min-h-screen">
      <TopBar title="All Employees" subtitle="Manage all employees across all companies" />
      <div className="p-3 md:p-6">
        <UserList />
      </div>
    </div>
  );
}
