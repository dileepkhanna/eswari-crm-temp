import TopBar from "@/components/layout/TopBar";
import TaskList from "@/components/tasks/TaskList";
import { useCustomers } from "@/contexts/CustomerContext";

export default function AdminTasks() {
  const { employees } = useCustomers();

  return (
    <div className="min-h-screen">
      <TopBar title="Task Management" subtitle="View and manage all tasks" />
      <div className="p-4 md:p-6">
        <TaskList canCreate canEdit employees={employees} />
      </div>
    </div>
  );
}
