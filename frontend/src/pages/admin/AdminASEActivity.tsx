import AdminActivity from './AdminActivity';

/**
 * ASE Technologies Activity page — renders AdminActivity with ASE company (id=3) pre-selected.
 * This is reached via /admin/ase-activity from the ASE Technologies sidebar section.
 */
export default function AdminASEActivity() {
  return <AdminActivity defaultCompanyId="3" />;
}
