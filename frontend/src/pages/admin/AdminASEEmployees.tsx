import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';
import { apiClient } from '@/lib/api';
import { DBUser } from '@/types/user';
import { transformUser } from '@/lib/transformUser';
import { toast } from 'sonner';

export default function AdminASEEmployees() {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  // Fetch ASE Technologies company ID
  const fetchASECompany = async () => {
    try {
      const companiesData = await apiClient.getCompanies();
      // Handle both array and object with results property
      const companies = Array.isArray(companiesData) ? companiesData : companiesData.results || [];
      const aseCompany = companies.find((c: any) => 
        c.code === 'ASE_TECH' || c.code === 'ASE' || c.name.includes('ASE')
      );
      return aseCompany;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const aseCompany = await fetchASECompany();
      
      if (!aseCompany) {
        toast.error('ASE Technologies company not found');
        setLoading(false);
        return;
      }

      // Fetch users filtered by ASE company using API parameter
      const response = await apiClient.getUsers({ company: aseCompany.id });
      
      const transformedUsers: DBUser[] = response.map(transformUser);
      
      setUsers(transformedUsers);
      setCompanies([aseCompany]);
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
        title="ASE Technologies — Employees" 
        subtitle="Manage ASE Technologies employees"
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
