import { useEffect, useState } from 'react';
import TopBar from "@/components/layout/TopBar";
import TaskList from "@/components/tasks/TaskList";
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';

export default function ManagerTasks() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user) return;
      
      try {
        const users = await apiClient.getUsers();
        // For managers, show their team members
        if (user.role === 'manager') {
          setEmployees(users.filter(u => u.manager === parseInt(user.id)));
        } else if (user.role === 'admin') {
          // For admins, show all users
          setEmployees(users);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };

    fetchEmployees();
  }, [user]);

  return (
    <div className="min-h-screen">
      <TopBar title="Tasks" subtitle="Manage tasks" />
      <div className="p-4 md:p-6">
        <TaskList canCreate canEdit isManagerView employees={employees} />
      </div>
    </div>
  );
}
