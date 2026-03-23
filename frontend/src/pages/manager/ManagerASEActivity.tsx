import ManagerActivity from './ManagerActivity';

/**
 * ASE Technologies Activity page for managers.
 * Reached via /manager/ase-activity from the ASE Technologies sidebar section.
 * ManagerActivity already scopes to the manager's company via user.company.id.
 */
export default function ManagerASEActivity() {
  return <ManagerActivity />;
}
