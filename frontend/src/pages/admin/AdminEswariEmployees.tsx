import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';
import { apiClient } from '@/lib/api';
import { DBUser } from '@/types/user';
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
      
      // Transform Django user data to match frontend interface
      const transformedUsers: DBUser[] = response.map((user: any) => ({
        id: user.id.toString(),
        user_id: user.username,
        name: `${user.first_name} ${user.last_name}`.trim() || user.username,
        email: user.email,
        phone: user.phone || null,
        address: null,
        designation: user.designation || null,
        joining_date: user.joining_date || null,
        role: user.role,
        status: 'active',
        manager_id: user.manager?.toString() || null,
        manager_name: user.manager_name || null,
        company: user.company_info || user.company,
        company_name: user.company_info?.name || null,
        created_at: user.created_at,
        updated_at: user.created_at,
      }));
      
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
