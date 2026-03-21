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
