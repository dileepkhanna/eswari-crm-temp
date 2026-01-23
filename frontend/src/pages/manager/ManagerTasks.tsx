import TopBar from "@/components/layout/TopBar";
import TaskList from "@/components/tasks/TaskList";

export default function ManagerTasks() {
  return (
    <div className="min-h-screen">
      <TopBar title="Tasks" subtitle="Manage tasks" />
      <div className="p-4 md:p-6">
        <TaskList canCreate canEdit isManagerView />
      </div>
    </div>
  );
}
