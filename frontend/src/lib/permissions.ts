import { UserRole } from '@/types';

/**
 * Determines if the current user can view customer phone numbers
 * - Admins and employees can see all phone numbers
 * - Managers can only see phone numbers for customers they created
 */
export function canViewCustomerPhone(userRole: UserRole, currentUserId?: string, customerCreatedBy?: string): boolean {
  // Admins and employees can see all phone numbers
  if (userRole === 'admin' || userRole === 'employee') {
    return true;
  }
  
  // Managers can only see phone numbers for customers they created
  if (userRole === 'manager') {
    return currentUserId === customerCreatedBy;
  }
  
  return false;
}

/**
 * Legacy function for backward compatibility
 * Use canViewCustomerPhone with parameters instead
 */
export function canViewCustomerPhoneBasic(userRole: UserRole): boolean {
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

/**
 * Masks an email address for privacy
 * Shows only the first 2 characters and domain: "john@example.com" -> "jo***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@****.com';
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `**@${domain}`;
  }
  
  const maskedLocal = localPart.substring(0, 2) + '*'.repeat(Math.max(1, localPart.length - 2));
  return `${maskedLocal}@${domain}`;
}