import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextDjango';

interface Props {
  adminEl: React.ReactElement;
  managerEl: React.ReactElement;
  staffEl: React.ReactElement;
  basePath: string;
}

export default function DashboardIndex({ adminEl, managerEl, staffEl, basePath }: Props) {
  const { user } = useAuth();
  const code = user?.company?.code || '';
  const isCapital = code === 'ESWARI_CAP';

  if (isCapital) return <Navigate to={`${basePath}/capital-dashboard`} replace />;

  if (basePath === '/admin') return adminEl;
  if (basePath === '/manager') return managerEl;
  return staffEl;
}
