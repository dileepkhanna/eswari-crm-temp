import { UserRole } from '@/types';

/**
 * Determines if the current user can view customer phone numbers
 * Only employees and admins can see phone numbers, managers cannot
 */
export function canViewCustomerPhone(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'employee';
}

/**
 * Determines if the current user has manager-level restrictions
 * Managers have limited access to sensitive customer information
 */
export function isManagerView(userRole: UserRole): boolean {
  return userRole === 'manager';
}

/**
 * Determines if the current user can delete leads and tasks
 * Only admins and managers can delete, employees cannot
 */
export function canDeleteLeadsAndTasks(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

/**
 * Masks a phone number for privacy
 * Shows only the last 4 digits: "1234567890" -> "******7890"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}