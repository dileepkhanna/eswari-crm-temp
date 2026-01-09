import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';

export default function AdminUsers() {
  return (
    <div className="min-h-screen">
      <TopBar title="User Management" subtitle="Manage staff and manager accounts" />
      <div className="p-6">
        <UserList />
      </div>
    </div>
  );
}
