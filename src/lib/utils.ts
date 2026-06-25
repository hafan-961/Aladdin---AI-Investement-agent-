// ============================================
// Alladin – Utility helpers
// ============================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as currency. */
export function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format large numbers (1.2B, 340M, etc.). */
export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(2);
}

/** Format a percentage value. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Safe JSON parse with fallback. */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** Sleep for ms duration (useful for rate-limit back-off). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Truncate text to maxLength, adding ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
