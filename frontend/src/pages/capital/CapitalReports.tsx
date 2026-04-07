import { useMemo } from 'react';
import AdminReports from '@/pages/admin/AdminReports';
import { useCompany } from '@/contexts/CompanyContext';
import { useCapital } from '@/contexts/CapitalCustomerContext';

export default function CapitalReports() {
  const { availableCompanies, selectedCompany } = useCompany();
  const { customers, tasks } = useCapital();

  const capitalCompanyId = useMemo(() => {
    const found = availableCompanies.find(c => c.code === 'ESWARI_CAP');
    if (found) return String(found.id);
    if (selectedCompany?.code === 'ESWARI_CAP') return String(selectedCompany.id);
    return undefined;
  }, [availableCompanies, selectedCompany]);

  return (
    <AdminReports
      capitalCompanyId={capitalCompanyId}
      capitalCustomersCount={customers.length}
      capitalTasksCount={tasks.length}
    />
  );
}
