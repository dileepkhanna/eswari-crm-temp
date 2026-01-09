import TopBar from '@/components/layout/TopBar';
import ProjectList from '@/components/projects/ProjectList';

export default function ManagerProjects() {
  return (
    <div className="min-h-screen">
      <TopBar title="Projects" subtitle="Manage real estate projects" />
      <div className="p-4 md:p-6">
        <ProjectList canCreate={true} canEdit={true} canDelete={false} />
      </div>
    </div>
  );
}
