import TopBar from '@/components/layout/TopBar';
import { TaskList } from './TaskList';

export default function MarketingTasksPage() {
  return (
    <div className="min-h-screen">
      <TopBar title="Tasks" subtitle="Manage your tasks" />
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        <TaskList title="My Tasks" showFilters={true} />
      </div>
    </div>
  );
}
