import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';
import { apiClient } from '@/lib/api';
import { DBUser } from '@/types/user';
import { transformUser } from '@/lib/transformUser';
import { toast } from 'sonner';

export default function AdminCapitalEmployees() {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  // Fetch Eswari Capital company ID
  const fetchCapitalCompany = async () => {
    try {
      const companiesData = await apiClient.getCompanies();
      // Handle both array and object with results property
      const companies = Array.isArray(companiesData) ? companiesData : companiesData.results || [];
      const capitalCompany = companies.find((c: any) => 
        c.code === 'ESWARI_CAPITAL' || c.name.includes('Eswari Capital')
      );
      return capitalCompany;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const capitalCompany = await fetchCapitalCompany();
      
      if (!capitalCompany) {
        toast.error('Eswari Capital company not found');
        setLoading(false);
        return;
      }

      // Fetch users filtered by Eswari Capital company using API parameter
      const response = await apiClient.getUsers({ company: capitalCompany.id });
      
      const transformedUsers: DBUser[] = response.map(transformUser);
      
      setUsers(transformedUsers);
      setCompanies([capitalCompany]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    fetchUsers();
  };

  return (
    <div className="min-h-screen">
      <TopBar 
        title="Eswari Capital — Employees" 
        subtitle="Manage Eswari Capital employees"
      />
      <div className="p-3 sm:p-4 md:p-6">
        <UserList
          users={users}
          companies={companies}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
