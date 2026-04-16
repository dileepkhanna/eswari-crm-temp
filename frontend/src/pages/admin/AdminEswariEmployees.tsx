import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';
import { apiClient } from '@/lib/api';
import { DBUser } from '@/types/user';
import { transformUser } from '@/lib/transformUser';
import { toast } from 'sonner';

export default function AdminEswariEmployees() {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  // Fetch Eswari Group company ID
  const fetchEswariCompany = async () => {
    try {
      const companiesData = await apiClient.getCompanies();
      // Handle both array and object with results property
      const companies = Array.isArray(companiesData) ? companiesData : companiesData.results || [];
      const eswariCompany = companies.find((c: any) => 
        c.code === 'ESWARI_GROUP' || c.name.includes('Eswari Group')
      );
      return eswariCompany;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const eswariCompany = await fetchEswariCompany();
      
      if (!eswariCompany) {
        toast.error('Eswari Group company not found');
        setLoading(false);
        return;
      }

      // Fetch users filtered by Eswari Group company using API parameter
      const response = await apiClient.getUsers({ company: eswariCompany.id });
      
      const transformedUsers: DBUser[] = response.map(transformUser);
      
      setUsers(transformedUsers);
      setCompanies([eswariCompany]);
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
        title="Eswari Group — Employees" 
        subtitle="Manage Eswari Group employees"
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
