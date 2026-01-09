import TopBar from "@/components/layout/TopBar";
import TaskList from "@/components/tasks/TaskList";

export default function StaffTasks() {
  return (
    <div className="min-h-screen">
      <TopBar title="Tasks" subtitle="Create and manage tasks" />
      <div className="p-4 md:p-6">
        <TaskList canCreate canEdit />
      </div>
    </div>
  );
}
