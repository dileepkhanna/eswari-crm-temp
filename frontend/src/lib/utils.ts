import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | undefined | null,
  options?: {
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  }
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₹0';
  }

  const { showSymbol = true, compact = false, decimals = 0 } = options || {};

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(numAmount);
  
  if (!showSymbol) {
    formatted = formatted.replace('₹', '').trim();
  }

  return formatted;
}

/**
 * Format a Date as YYYY-MM-DD in the user's local timezone.
 * Use this instead of `date.toISOString().split('T')[0]`, which returns the UTC
 * date and is off by one day for IST users between 00:00 and 05:30, and for any
 * Date created at local midnight (e.g. `new Date(y, m, 1)`).
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
