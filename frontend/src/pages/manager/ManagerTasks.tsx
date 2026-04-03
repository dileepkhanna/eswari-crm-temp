import TopBar from "@/components/layout/TopBar";
import TaskList from "@/components/tasks/TaskList";
import { useCustomers } from "@/contexts/CustomerContext";

export default function ManagerTasks() {
  const { employees } = useCustomers();

  return (
    <div className="min-h-screen">
      <TopBar title="Tasks" subtitle="Manage tasks" />
      <div className="p-4 md:p-6">
        <TaskList canCreate canEdit isManagerView employees={employees} />
      </div>
    </div>
  );
}
