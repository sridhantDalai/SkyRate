import { formatINRCompact, formatDateShort, formatMonthLabel } from '@/lib/formatters';

/** Recharts custom tooltip container styling. */
export const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: '#020817',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  padding: '10px 14px',
  fontSize: '11px',
};

/** Common axis tick style (applied to all charts). */
export const AXIS_TICK_STYLE = { fontSize: 11, fill: 'currentColor' };

/** Palette used across all charts for consistent colour mapping. */
export const CHART_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
] as const;

export type Granularity = 'daily' | 'weekly' | 'monthly';

/** Returns a function that formats X-axis date ticks based on granularity. */
export function dateTickFormatter(granularity: Granularity): (val: string) => string {
  if (granularity === 'monthly') return formatMonthLabel;
  return formatDateShort;
}

/**
 * Formats a Y-axis tick as compact INR.
 * Recharts passes the raw numeric value as the first arg.
 */
export function inrTickFormatter(val: unknown): string {
  if (typeof val !== 'number' || isNaN(val)) return '';
  return formatINRCompact(val);
}

/** Formats a Y-axis tick as an index value (e.g. 114.82). */
export function indexTickFormatter(val: unknown): string {
  if (typeof val !== 'number' || isNaN(val)) return '';
  return val.toFixed(2);
}

/** Formats raw number to a compact string (no currency symbol). */
export function compactNumberFormatter(val: unknown): string {
  if (typeof val !== 'number' || isNaN(val)) return '';
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'K';
  return String(Math.round(val));
}

/**
 * Calculates a sensible Y-axis domain with 10% headroom.
 * Returns ['auto','auto'] when series is empty or invalid.
 */
export function calcYDomain(
  values: (number | null | undefined)[],
  bottomAnchor?: number
): [number | string, number | string] {
  const valid = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return ['auto', 'auto'];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return [Math.max(0, min - 10), max + 10];
  const padding = (max - min) * 0.12;
  const lower = bottomAnchor !== undefined ? Math.min(min - padding, bottomAnchor) : min - padding;
  return [Math.floor(Math.max(0, lower)), Math.ceil(max + padding)];
}
