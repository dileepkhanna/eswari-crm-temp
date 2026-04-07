import { useMemo } from 'react';
import AdminActivity from '@/pages/admin/AdminActivity';
import { useCompany } from '@/contexts/CompanyContext';

export default function CapitalActivity() {
  const { availableCompanies, selectedCompany } = useCompany();

  const capitalCompanyId = useMemo(() => {
    const found = availableCompanies.find(c => c.code === 'ESWARI_CAP');
    if (found) return String(found.id);
    if (selectedCompany?.code === 'ESWARI_CAP') return String(selectedCompany.id);
    return undefined;
  }, [availableCompanies, selectedCompany]);

  return <AdminActivity defaultCompanyId={capitalCompanyId} />;
}
