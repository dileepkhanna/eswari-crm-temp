import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import UserList from '@/components/users/UserList';
import { apiClient } from '@/lib/api';
import { DBUser } from '@/types/user';
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
